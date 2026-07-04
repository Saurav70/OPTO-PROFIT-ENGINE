import re
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import List, Optional, Dict, Any


def _validate_password_strength(v: str) -> str:
    """Shared password strength validator (MED-1).

    Requires at least:
    - 8 characters (enforced by Field min_length)
    - 1 uppercase letter
    - 1 digit
    - 1 special character
    """
    if not re.search(r"[A-Z]", v):
        raise ValueError("Password must contain at least one uppercase letter.")
    if not re.search(r"[0-9]", v):
        raise ValueError("Password must contain at least one digit.")
    if not re.search(r"[^A-Za-z0-9]", v):
        raise ValueError("Password must contain at least one special character (e.g. @, #, !, $, %).")
    return v


# ── Dynamic Variable System ──────────────────────────────────────
class VariableDefinition(BaseModel):
    """Represents a single user-defined variable for formulas and config."""
    key: str            # e.g., "shift_time" — used in formula strings
    label: str          # e.g., "Shift Time (mins)" — displayed in UI
    value: float        # e.g., 480.0
    unit: str           # e.g., "min", "₹", "units"
    category: Optional[str] = "General"  # e.g., "Financial", "Production"


# ── Dynamic Config (replaces hardcoded fields) ───────────────────
class Config(BaseModel):
    productName: str = "New Product"
    variables: List[VariableDefinition] = []
    formulas: Dict[str, str] = {}
    # e.g., {"TaktTime": "shift_time / demand", "LineEfficiency": "(total_task_time / (n_actual * takt_time)) * 100"}
    custom_zones: List[str] = []
    # e.g., ["Wet-Zone", "High-Voltage", "Clean-Room"]
    zone_exclusions: Dict[str, List[str]] = {}
    # e.g., {"Wet-Zone": ["High-Voltage"]} means those zones can't share a station
    co_locations: List[List[str]] = []
    # e.g., [["Task-A", "Task-B"]] means Task-A and Task-B must be in the same station
    separations: List[List[str]] = []
    # e.g., [["Task-C", "Task-D"]] means Task-C and Task-D must NOT be in the same station
    target_efficiency: Optional[int] = 85
    layout_presets: Optional[Dict[str, Any]] = {}


# ── Flexible Task Model ──────────────────────────────────────────
class Task(BaseModel):
    id: str
    name: str
    time: float
    predecessors: List[str]
    zoning: Optional[str] = "None"
    custom_attributes: Optional[Dict[str, Any]] = {}
    # e.g., {"RequiredSkill": "Level 2", "Tool": "Torque Wrench", "ErgonomicRisk": 3}


# ── Profile (stores a complete project snapshot) ─────────────────
class Profile(BaseModel):
    id: str
    name: str
    tasks: List[Task]
    config: Config
    timestamp: str


# ── Auth Models ──────────────────────────────────────────────────
class User(BaseModel):
    id: str = Field(alias="_id")
    username: str
    username_normalized: str
    email: Optional[EmailStr] = None
    password_hash: str
    created_at: datetime
    is_2fa_enabled: Optional[bool] = False
    two_factor_secret: Optional[str] = None
    full_name: Optional[str] = Field(default=None, max_length=100)
    phone_number: Optional[str] = Field(default=None, max_length=20)
    role: Optional[str] = Field(default="User", max_length=50)
    tenant_id: Optional[str] = Field(default=None, max_length=20)


class RegisterRequest(BaseModel):
    username: Optional[str] = Field(default=None, min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=128)
    email: Optional[EmailStr] = None
    company_name: Optional[str] = Field(default=None, max_length=100)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)


class LoginRequest(BaseModel):
    username: str = Field(max_length=50)
    password: str = Field(max_length=128)


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    two_factor_required: Optional[bool] = False


class AuthUserResponse(BaseModel):
    id: str
    username: str
    email: Optional[EmailStr] = None
    is_2fa_enabled: Optional[bool] = False
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    role: Optional[str] = None
    tenant_id: Optional[str] = None
    created_at: Optional[datetime] = None

class UpdateUserRequest(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=100)
    phone_number: Optional[str] = Field(default=None, max_length=20)
    email: Optional[EmailStr] = None

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(max_length=128)
    new_password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(max_length=128)

    @field_validator("new_password")
    @classmethod
    def new_password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(max_length=200)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def new_password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)

class TwoFactorSetupResponse(BaseModel):
    secret: str
    qrcode_svg: str


class TwoFactorVerifyRequest(BaseModel):
    code: str


class TwoFactorEnableRequest(BaseModel):
    code: str


class TwoFactorDisableRequest(BaseModel):
    code: str
