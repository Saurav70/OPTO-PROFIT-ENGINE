"""
Config & Profiles Router — /api/config, /api/profiles/*
=========================================================
Handles user/tenant configuration and saved profile snapshots.
"""
import json
from typing import List

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..sql_models import ConfigDB, ProfileDB
from ..models import Config, Profile
from ..auth import get_current_user, SESSION_COOKIE_NAME
from ..sql_models import UserDB, SessionDB

router = APIRouter()

DEFAULT_CONFIG = {
    "productName": "Digital Oscilloscope",
    "variables": [
        {"key": "shift_time", "label": "Shift Time", "value": 480.0, "unit": "min", "category": "Production"},
        {"key": "demand", "label": "Daily Demand", "value": 16.0, "unit": "units", "category": "Production"},
        {"key": "unit_price", "label": "Unit Price", "value": 25000.0, "unit": "₹", "category": "Financial"},
        {"key": "unit_cost", "label": "Unit Cost", "value": 15000.0, "unit": "₹", "category": "Financial"},
        {"key": "work_days", "label": "Work Days / Month", "value": 25.0, "unit": "days", "category": "Financial"},
        {"key": "current_cycle_time", "label": "Current Cycle Time", "value": 35.0, "unit": "min", "category": "Baseline"},
        {"key": "current_operators", "label": "Current Operators", "value": 5.0, "unit": "people", "category": "Baseline"},
        {"key": "operator_cost_per_hour", "label": "Operator Cost / Hour", "value": 150.0, "unit": "₹", "category": "Financial"},
        {"key": "investment_cost", "label": "Investment Cost", "value": 25000.0, "unit": "₹", "category": "Financial"},
        {"key": "target_cycle_time", "label": "Target Cycle Time", "value": 30.0, "unit": "min", "category": "Production"},
        {"key": "currency_symbol", "label": "Currency Symbol", "value": 0.0, "unit": "₹", "category": "General"},
    ],
    "formulas": {
        "TaktTime": "shift_time / demand",
        "MonthlyProfit": "demand * work_days * (unit_price - unit_cost)",
        "ROI_Efficiency": "MonthlyProfit * 0.10",
    },
    "custom_zones": [],
    "zone_exclusions": {},
    "co_locations": [],
    "separations": [],
    "target_efficiency": 85,
}


def _require_user(
    request: Request,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Shared dependency: validate cookie or Bearer token."""
    from ..auth import get_current_user as _gcu
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    user = _gcu(request=request, bearer_token=token, db=db)
    return {
        "_id": user.id,
        "username": user.username,
        "email": user.email,
        "tenant_id": user.tenant_id,
        "role": user.role,
    }


# ── Config Endpoints ──────────────────────────────────────────────

@router.get("/api/config", response_model=Config)
def get_config(current_user: dict = Depends(_require_user), db: Session = Depends(get_db)):
    user_id = current_user["_id"]
    tenant_id = current_user.get("tenant_id")
    config_row = None
    if tenant_id:
        config_row = db.query(ConfigDB).filter(ConfigDB.tenant_id == tenant_id).first()
    if not config_row:
        config_row = db.query(ConfigDB).filter(ConfigDB.user_id == user_id).first()
    if not config_row:
        config_row = ConfigDB(user_id=user_id, tenant_id=tenant_id, data_json=json.dumps(DEFAULT_CONFIG), layout_presets_json=json.dumps({}))
        db.add(config_row)
        db.commit()
        db.refresh(config_row)
    config_dict = config_row.data
    config_dict["layout_presets"] = config_row.layout_presets
    return config_dict


@router.put("/api/config")
def update_config(config: Config, current_user: dict = Depends(_require_user), db: Session = Depends(get_db)):
    user_id = current_user["_id"]
    tenant_id = current_user.get("tenant_id")
    config_row = None
    if tenant_id:
        config_row = db.query(ConfigDB).filter(ConfigDB.tenant_id == tenant_id).first()
    if not config_row:
        config_row = db.query(ConfigDB).filter(ConfigDB.user_id == user_id).first()
    config_dict = config.dict()  # pyrefly: ignore
    layout_presets = config_dict.pop("layout_presets", {})
    if config_row:
        config_row.data_json = json.dumps(config_dict)
        config_row.layout_presets_json = json.dumps(layout_presets)
        if tenant_id and not config_row.tenant_id:
            config_row.tenant_id = tenant_id
    else:
        config_row = ConfigDB(user_id=user_id, tenant_id=tenant_id, data_json=json.dumps(config_dict), layout_presets_json=json.dumps(layout_presets))
        db.add(config_row)
    db.commit()
    return {"message": "Config updated"}


# ── Profiles Endpoints ────────────────────────────────────────────

@router.get("/api/profiles", response_model=List[Profile])
def get_profiles(current_user: dict = Depends(_require_user), db: Session = Depends(get_db)):
    tenant_id = current_user.get("tenant_id")
    if tenant_id:
        rows = db.query(ProfileDB).filter(ProfileDB.tenant_id == tenant_id).all()
    else:
        rows = db.query(ProfileDB).filter(ProfileDB.user_id == current_user["_id"]).all()
    return [row.to_dict() for row in rows]


@router.post("/api/profiles", response_model=Profile)
def create_profile(profile: Profile, current_user: dict = Depends(_require_user), db: Session = Depends(get_db)):
    tenant_id = current_user.get("tenant_id")
    db.add(ProfileDB(
        profile_id=profile.id,
        user_id=current_user["_id"],
        tenant_id=tenant_id,
        name=profile.name,
        data_json=json.dumps({"tasks": [t.dict() for t in profile.tasks], "config": profile.config.dict()}),  # pyrefly: ignore
        timestamp=profile.timestamp,
    ))
    db.commit()
    return profile


@router.delete("/api/profiles/{profile_id}")
def delete_profile(profile_id: str, current_user: dict = Depends(_require_user), db: Session = Depends(get_db)):
    tenant_id = current_user.get("tenant_id")
    if tenant_id:
        count = db.query(ProfileDB).filter(ProfileDB.profile_id == profile_id, ProfileDB.tenant_id == tenant_id).delete()
    else:
        count = db.query(ProfileDB).filter(ProfileDB.profile_id == profile_id, ProfileDB.user_id == current_user["_id"]).delete()
    db.commit()
    if count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"message": "Profile deleted"}
