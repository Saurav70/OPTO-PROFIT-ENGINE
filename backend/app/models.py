from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any


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
    target_efficiency: Optional[int] = 85


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
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=128)
    email: Optional[EmailStr] = None


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


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(max_length=200)
    new_password: str = Field(min_length=8, max_length=128)


class TwoFactorSetupResponse(BaseModel):
    secret: str
    qrcode_svg: str


class TwoFactorVerifyRequest(BaseModel):
    code: str


class TwoFactorEnableRequest(BaseModel):
    code: str


class TwoFactorDisableRequest(BaseModel):
    code: str
