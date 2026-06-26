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

# pyrefly: ignore [missing-import]
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship

from .database import Base


# ── Helper: UTC-now default ──────────────────────────────────────
def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


# ══════════════════════════════════════════════════════════════════
#  Users
# ══════════════════════════════════════════════════════════════════
class UserDB(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)  # UUID-style string
    username = Column(String(50), nullable=False)
    username_normalized = Column(String(50), nullable=False, unique=True, index=True)
    email = Column(String(254), nullable=True)
    password_hash = Column(String(200), nullable=False)
    created_at = Column(DateTime, default=_utc_now, nullable=False)
    is_2fa_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String(64), nullable=True)
    full_name = Column(String(100), nullable=True)
    phone_number = Column(String(20), nullable=True)
    role = Column(String(50), default="User")
    tenant_id = Column(String(20), nullable=True)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)

    # Relationships
    tasks = relationship("TaskDB", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("SessionDB", back_populates="user", cascade="all, delete-orphan")
    config = relationship("ConfigDB", back_populates="user", uselist=False, cascade="all, delete-orphan")
    profiles = relationship("ProfileDB", back_populates="user", cascade="all, delete-orphan")
    password_reset_tokens = relationship("PasswordResetTokenDB", back_populates="user", cascade="all, delete-orphan")


# ══════════════════════════════════════════════════════════════════
#  Sessions (auth tokens)
# ══════════════════════════════════════════════════════════════════
class SessionDB(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    token_hash = Column(String(64), nullable=False, unique=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=_utc_now, nullable=False)

    user = relationship("UserDB", back_populates="sessions")


# ══════════════════════════════════════════════════════════════════
#  Tasks (assembly line process data)
# ══════════════════════════════════════════════════════════════════
class TaskDB(Base):
    __tablename__ = "tasks"

    pk = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(String(50), nullable=False)        # User-facing ID (e.g. "A", "B")
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    tenant_id = Column(String(20), nullable=True, index=True)
    name = Column(String(200), nullable=False)
    time = Column(Float, nullable=False, default=0.0)
    predecessors_json = Column(Text, default="[]")      # JSON-encoded list of task IDs
    zoning = Column(String(100), default="None")
    custom_attributes_json = Column(Text, default="{}") # JSON-encoded dict

    user = relationship("UserDB", back_populates="tasks")

    __table_args__ = (
        UniqueConstraint("task_id", "user_id", name="uq_task_user"),
    )

    @property
    def predecessors(self) -> list:
        try:
            return json.loads(self.predecessors_json or "[]")
        except (json.JSONDecodeError, TypeError):
            return []

    @predecessors.setter
    def predecessors(self, value: list):
        self.predecessors_json = json.dumps(value)

    @property
    def custom_attributes(self) -> dict:
        try:
            return json.loads(self.custom_attributes_json or "{}")
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

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    tenant_id = Column(String(20), nullable=True, index=True)
    data_json = Column(Text, nullable=False, default="{}")  # Full config dict as JSON

    user = relationship("UserDB", back_populates="config")

    @property
    def data(self) -> dict:
        try:
            return json.loads(self.data_json or "{}")
        except (json.JSONDecodeError, TypeError):
            return {}

    @data.setter
    def data(self, value: dict):
        self.data_json = json.dumps(value)


# ══════════════════════════════════════════════════════════════════
#  Profiles (project snapshots)
# ══════════════════════════════════════════════════════════════════
class ProfileDB(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    profile_id = Column(String(100), nullable=False)   # User-facing ID
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    tenant_id = Column(String(20), nullable=True, index=True)
    name = Column(String(200), nullable=False)
    data_json = Column(Text, nullable=False, default="{}")  # Full snapshot (tasks + config)
    timestamp = Column(String(100), nullable=True)

    user = relationship("UserDB", back_populates="profiles")

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
            return json.loads(self.data_json or "{}")
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

    id = Column(Integer, primary_key=True, autoincrement=True)
    token_hash = Column(String(64), nullable=False, unique=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=_utc_now, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)

    user = relationship("UserDB", back_populates="password_reset_tokens")
