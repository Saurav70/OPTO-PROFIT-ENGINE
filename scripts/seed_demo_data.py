from pymongo import MongoClient
from datetime import datetime, timezone

def seed_demo_data():
    client = MongoClient("mongodb://localhost:27017")
    db = client["optoprofit_db"]
    
    # 1. Update Config
    config_coll = db["config"]
    demo_config = {
        "productName": "OPTO-PUMP G2",
        "variables": [
            {"key": "shift_time", "label": "Shift Time", "value": 480, "unit": "min", "category": "Production"},
            {"key": "demand", "label": "Daily Demand", "value": 60, "unit": "units", "category": "Production"},
            {"key": "unit_price", "label": "Unit Price", "value": 12000, "unit": "₹", "category": "Financial"},
            {"key": "unit_cost", "label": "Unit Cost", "value": 8500, "unit": "₹", "category": "Financial"},
            {"key": "work_days", "label": "Work Days / Month", "value": 25, "unit": "days", "category": "General"},
            {"key": "currency_symbol", "label": "Currency Symbol", "value": 0, "unit": "₹", "category": "General"} # value 0 is placeholder
        ],
        "formulas": {
            "TaktTime": "shift_time / demand",
            "MonthlyRevenue": "demand * work_days * unit_price",
            "MonthlyProfit": "demand * work_days * (unit_price - unit_cost)",
            "ROI_Efficiency": "(demand > 50) ? (MonthlyProfit * 0.15) : (MonthlyProfit * 0.10)"
        },
        "custom_zones": ["Stationary", "Positive-Mechanical", "General", "Sensitive", "Wet-Zone", "Digital", "Standard", "Packaging"],
        "zone_exclusions": {
            "Wet-Zone": ["Sensitive", "Digital"]
        },
        "updatedAt": datetime.now(timezone.utc)
    }
    config_coll.replace_one({}, demo_config, upsert=True)
    print("[OK] Dynamic Demo Config Seeded (Product: OPTO-PUMP G2)")

    # 2. Update Tasks
    tasks_coll = db["tasks"]
    tasks_coll.delete_many({}) # Clear existing
    
    demo_tasks = [
        {"id": "T1", "name": "Base Frame Setup", "time": 4.5, "predecessors": ["None"], "zoning": "Stationary"},
        {"id": "T2", "name": "Motor Mounting", "time": 8.0, "predecessors": ["T1"], "zoning": "Positive-Mechanical"},
        {"id": "T3", "name": "Impeller Alignment", "time": 6.5, "predecessors": ["T1"], "zoning": "Positive-Mechanical"},
        {"id": "T4", "name": "Housing Sealing", "time": 5.0, "predecessors": ["T2", "T3"], "zoning": "General"},
        {"id": "T5", "name": "Electrical Harness", "time": 7.5, "predecessors": ["T2"], "zoning": "Sensitive"},
        {"id": "T6", "name": "Hydraulic Testing", "time": 10.0, "predecessors": ["T4"], "zoning": "Wet-Zone"},
        {"id": "T7", "name": "Control Module Sync", "time": 6.0, "predecessors": ["T5", "T6"], "zoning": "Digital"},
        {"id": "T8", "name": "Final QC Inspection", "time": 4.0, "predecessors": ["T7"], "zoning": "Standard"},
        {"id": "T9", "name": "Precision Labeling", "time": 2.5, "predecessors": ["T8"], "zoning": "Packaging"},
        {"id": "T10", "name": "Dispatch Boxing", "time": 3.0, "predecessors": ["T9"], "zoning": "Packaging"}
    ]
    
    tasks_coll.insert_many(demo_tasks)
    print(f"[OK] {len(demo_tasks)} Demo Tasks Seeded with Precedence Logic.")

    print("\n[SUCCESS] Demo data is now live. Refresh the dashboard to see the optimized layout!")

if __name__ == "__main__":
    seed_demo_data()
