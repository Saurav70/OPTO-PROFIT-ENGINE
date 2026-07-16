"""
OPTO-PROFIT SQLAlchemy ORM Models
=================================
Defines the relational schema for local SQLite persistence.

Each model maps to a table.  JSON columns are used for nested /
variable-length data (predecessors, custom_attributes, config blobs)
to keep the schema simple while still supporting rich payloads.
"""

import json
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
import sqlalchemy.types as types
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship, Mapped, mapped_column

from .database import Base


# ── Helper: UTC-now default ──────────────────────────────────────
def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


# ── Transparent Hardware-Locked Encryption ───────────────────────
_fernet_instance = None

def get_fernet():
    global _fernet_instance
    if _fernet_instance is None:
        from .license import get_hardware_fingerprint
        from .paths import get_persistent_salt_path
        import uuid
        
        salt_path = get_persistent_salt_path()
        if not salt_path.exists():
            salt_path.parent.mkdir(parents=True, exist_ok=True)
            salt_path.write_bytes(uuid.uuid4().bytes)
        dynamic_salt = salt_path.read_bytes()

        hwid = get_hardware_fingerprint().encode('utf-8')
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=dynamic_salt,
            iterations=600000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(hwid))
        _fernet_instance = Fernet(key)
    return _fernet_instance

def get_old_fernet(old_hwid: str) -> Fernet:
    """Derive the Fernet instance for the given old HWID."""
    from .paths import get_persistent_salt_path
    
    salt_path = get_persistent_salt_path()
    if not salt_path.exists():
        raise RuntimeError("Salt file missing during migration.")
    dynamic_salt = salt_path.read_bytes()

    hwid_bytes = old_hwid.encode('utf-8')
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=dynamic_salt,
        iterations=600000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(hwid_bytes))
    return Fernet(key)

class EncryptedString(types.TypeDecorator):
    impl = types.String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return get_fernet().encrypt(value.encode('utf-8')).decode('utf-8')
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            try:
                return get_fernet().decrypt(value.encode('utf-8')).decode('utf-8')
            except Exception:
                return value
        return value

class EncryptedText(types.TypeDecorator):
    impl = types.Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return get_fernet().encrypt(value.encode('utf-8')).decode('utf-8')
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            try:
                return get_fernet().decrypt(value.encode('utf-8')).decode('utf-8')
            except Exception:
                return value
        return value


# ══════════════════════════════════════════════════════════════════
#  Users
# ══════════════════════════════════════════════════════════════════
class UserDB(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # UUID-style string
    username: Mapped[str] = mapped_column(String(50), nullable=False)
    username_normalized: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    email: Mapped[Optional[str]] = mapped_column(EncryptedString(254), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utc_now, nullable=False)
    is_2fa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    two_factor_secret: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    full_name: Mapped[Optional[str]] = mapped_column(EncryptedString(100), nullable=True)
    phone_number: Mapped[Optional[str]] = mapped_column(EncryptedString(20), nullable=True)
    role: Mapped[str] = mapped_column(String(50), default="User")
    tenant_id: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    tasks: Mapped[List["TaskDB"]] = relationship("TaskDB", back_populates="user", cascade="all, delete-orphan")
    sessions: Mapped[List["SessionDB"]] = relationship("SessionDB", back_populates="user", cascade="all, delete-orphan")
    config: Mapped[Optional["ConfigDB"]] = relationship("ConfigDB", back_populates="user", uselist=False, cascade="all, delete-orphan")
    profiles: Mapped[List["ProfileDB"]] = relationship("ProfileDB", back_populates="user", cascade="all, delete-orphan")
    password_reset_tokens: Mapped[List["PasswordResetTokenDB"]] = relationship("PasswordResetTokenDB", back_populates="user", cascade="all, delete-orphan")


# ══════════════════════════════════════════════════════════════════
#  Sessions (auth tokens)
# ══════════════════════════════════════════════════════════════════
class SessionDB(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utc_now, nullable=False)

    user: Mapped["UserDB"] = relationship("UserDB", back_populates="sessions")


# ══════════════════════════════════════════════════════════════════
#  Tasks (assembly line process data)
# ══════════════════════════════════════════════════════════════════
class TaskDB(Base):
    __tablename__ = "tasks"

    pk: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task_id: Mapped[str] = mapped_column(String(50), nullable=False)        # User-facing ID (e.g. "A", "B")
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    tenant_id: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    name: Mapped[str] = mapped_column(EncryptedString(200), nullable=False)
    time: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    predecessors_json: Mapped[str] = mapped_column(EncryptedText, default="[]")      # JSON-encoded list of task IDs
    zoning: Mapped[str] = mapped_column(String(100), default="None")
    custom_attributes_json: Mapped[str] = mapped_column(EncryptedText, default="{}") # JSON-encoded dict

    user: Mapped["UserDB"] = relationship("UserDB", back_populates="tasks")

    __table_args__ = (
        UniqueConstraint("task_id", "user_id", name="uq_task_user"),
    )

    @property
    def predecessors(self) -> list:
        try:
            return json.loads(str(self.predecessors_json or "[]"))
        except (json.JSONDecodeError, TypeError):
            return []

    @predecessors.setter
    def predecessors(self, value: list):
        self.predecessors_json = json.dumps(value)

    @property
    def custom_attributes(self) -> dict:
        try:
            return json.loads(str(self.custom_attributes_json or "{}"))
        except (json.JSONDecodeError, TypeError):
            return {}

    @custom_attributes.setter
    def custom_attributes(self, value: dict):
        self.custom_attributes_json = json.dumps(value)

    def to_dict(self) -> dict:
        """Serialize to the API response shape expected by the frontend."""
        return {
            "id": self.task_id,
            "name": self.name,
            "time": self.time,
            "predecessors": self.predecessors,
            "zoning": self.zoning,
            "custom_attributes": self.custom_attributes,
        }


# ══════════════════════════════════════════════════════════════════
#  Config (project configuration — one per user)
# ══════════════════════════════════════════════════════════════════
class ConfigDB(Base):
    __tablename__ = "config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    tenant_id: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    data_json: Mapped[str] = mapped_column(EncryptedText, nullable=False, default="{}")  # Full config dict as JSON
    layout_presets_json: Mapped[str] = mapped_column(EncryptedText, nullable=False, default="{}")

    user: Mapped["UserDB"] = relationship("UserDB", back_populates="config")

    @property
    def data(self) -> dict:
        try:
            return json.loads(str(self.data_json or "{}"))
        except (json.JSONDecodeError, TypeError):
            return {}

    @data.setter
    def data(self, value: dict):
        self.data_json = json.dumps(value)

    @property
    def layout_presets(self) -> dict:
        try:
            return json.loads(str(self.layout_presets_json or "{}"))
        except (json.JSONDecodeError, TypeError):
            return {}

    @layout_presets.setter
    def layout_presets(self, value: dict):
        self.layout_presets_json = json.dumps(value)


# ══════════════════════════════════════════════════════════════════
#  Profiles (project snapshots)
# ══════════════════════════════════════════════════════════════════
class ProfileDB(Base):
    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    profile_id: Mapped[str] = mapped_column(String(100), nullable=False)   # User-facing ID
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    tenant_id: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    name: Mapped[str] = mapped_column(EncryptedString(200), nullable=False)
    data_json: Mapped[str] = mapped_column(EncryptedText, nullable=False, default="{}")  # Full snapshot (tasks + config)
    timestamp: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    user: Mapped["UserDB"] = relationship("UserDB", back_populates="profiles")

    def to_dict(self) -> dict:
        data = self.data
        return {
            "id": self.profile_id,
            "name": self.name,
            "tasks": data.get("tasks", []),
            "config": data.get("config", {}),
            "timestamp": self.timestamp,
        }

    @property
    def data(self) -> dict:
        try:
            return json.loads(str(self.data_json or "{}"))
        except (json.JSONDecodeError, TypeError):
            return {}

    @data.setter
    def data(self, value: dict):
        self.data_json = json.dumps(value)


# ══════════════════════════════════════════════════════════════════
#  Password Reset Tokens
# ══════════════════════════════════════════════════════════════════
class PasswordResetTokenDB(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utc_now, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    user: Mapped["UserDB"] = relationship("UserDB", back_populates="password_reset_tokens")
