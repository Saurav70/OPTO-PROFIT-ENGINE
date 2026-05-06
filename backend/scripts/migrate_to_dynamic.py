"""
Migration Script: migrate_to_dynamic.py
Converts any existing fixed-field OPTO-PROFIT Config documents to the new
dynamic Variable/Formula/Zone schema.

Run once against your MongoDB instance:
    python backend/scripts/migrate_to_dynamic.py

Safe to run multiple times (idempotent — skips already-migrated docs).
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "optoprofit")


# ── Default variable definitions for the OPTO-PUMP G2 seed data ────────────
DEFAULT_VARIABLES = [
    {"key": "shift_time",   "label": "Shift Time",          "value": 480,   "unit": "min",    "category": "Production"},
    {"key": "breaks",       "label": "Break Duration",       "value": 30,    "unit": "min",    "category": "Production"},
    {"key": "demand",       "label": "Daily Demand",         "value": 50,    "unit": "units",  "category": "Production"},
    {"key": "unit_price",   "label": "Unit Selling Price",   "value": 45000, "unit": "₹",      "category": "Financial"},
    {"key": "unit_cost",    "label": "Unit Production Cost", "value": 28000, "unit": "₹",      "category": "Financial"},
    {"key": "work_days",    "label": "Working Days/Month",   "value": 25,    "unit": "days",   "category": "Financial"},
]

DEFAULT_FORMULAS = {
    "TaktTime":      "(shift_time - breaks) / demand",
    "MonthlyProfit": "demand * work_days * (unit_price - unit_cost)",
    "ROI_Efficiency": "MonthlyProfit * 0.12",
}

DEFAULT_ZONES = ["Wet-Zone", "High-Voltage", "Clean-Room", "Mechanical"]


def _build_variables_from_legacy(doc: dict) -> list:
    """Attempts to map legacy flat fields to the new variables array."""
    variables = list(DEFAULT_VARIABLES)  # start with defaults

    # Override with any present legacy values
    legacy_map = {
        "shiftTime":        ("shift_time",   "min"),
        "demand":           ("demand",       "units"),
        "unitPrice":        ("unit_price",   "₹"),
        "unitCost":         ("unit_cost",    "₹"),
        "workDaysPerMonth": ("work_days",    "days"),
    }
    for legacy_key, (var_key, unit) in legacy_map.items():
        if legacy_key in doc:
            for v in variables:
                if v["key"] == var_key:
                    v["value"] = float(doc[legacy_key])
                    break

    return variables


async def migrate():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    configs = db["configs"]
    profiles = db["profiles"]

    migrated_configs = 0
    skipped_configs = 0
    migrated_profiles = 0

    # ── Migrate top-level configs ───────────────────────────────────────────
    async for doc in configs.find({}):
        doc_id = doc["_id"]

        # Skip if already migrated
        if "variables" in doc and isinstance(doc["variables"], list):
            skipped_configs += 1
            continue

        variables = _build_variables_from_legacy(doc)

        update = {
            "$set": {
                "variables":      variables,
                "formulas":       doc.get("formulas", DEFAULT_FORMULAS),
                "custom_zones":   doc.get("custom_zones", DEFAULT_ZONES),
                "zone_exclusions": doc.get("zone_exclusions", {}),
            },
            "$unset": {
                # Remove old flat fields
                "shiftTime": "",
                "demand": "",
                "unitPrice": "",
                "unitCost": "",
                "workDaysPerMonth": "",
                "currentCycleTime": "",
                "currentOperators": "",
                "targetCycleTime": "",
            }
        }
        await configs.update_one({"_id": doc_id}, update)
        migrated_configs += 1
        print(f"  ✓ Config '{doc.get('productName', doc_id)}' migrated.")

    # ── Migrate configs embedded in profiles ────────────────────────────────
    async for profile in profiles.find({}):
        profile_id = profile["_id"]
        config = profile.get("config", {})

        if "variables" in config and isinstance(config["variables"], list):
            continue  # already migrated

        variables = _build_variables_from_legacy(config)

        await profiles.update_one(
            {"_id": profile_id},
            {"$set": {
                "config.variables":       variables,
                "config.formulas":        config.get("formulas", DEFAULT_FORMULAS),
                "config.custom_zones":    config.get("custom_zones", DEFAULT_ZONES),
                "config.zone_exclusions": config.get("zone_exclusions", {}),
            }}
        )
        migrated_profiles += 1
        print(f"  ✓ Profile '{profile.get('name', profile_id)}' config migrated.")

    client.close()

    print("\n─── Migration Summary ───────────────────────────────")
    print(f"  Configs migrated : {migrated_configs}")
    print(f"  Configs skipped  : {skipped_configs} (already up-to-date)")
    print(f"  Profiles migrated: {migrated_profiles}")
    print("────────────────────────────────────────────────────")


if __name__ == "__main__":
    print("OPTO-PROFIT: Starting schema migration to dynamic variable system...\n")
    asyncio.run(migrate())
