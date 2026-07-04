import json
import os
from datetime import datetime, timezone

def generate_demo_opto():
    # 1. Define standard PDF tasks
    oscilloscope_tasks = [
        {"id": "A", "name": "PCB Preparation & Kitting", "time": 12.0, "predecessors": [], "zoning": "None", "custom_attributes": {}},
        {"id": "B", "name": "Motherboard SMT & Assembly", "time": 18.0, "predecessors": ["A"], "zoning": "None", "custom_attributes": {}},
        {"id": "C", "name": "Display Module Preparation", "time": 15.0, "predecessors": ["A"], "zoning": "None", "custom_attributes": {}},
        {"id": "D", "name": "Power Supply Unit Prep", "time": 10.0, "predecessors": ["A"], "zoning": "None", "custom_attributes": {}},
        {"id": "E", "name": "Core Integration", "time": 20.0, "predecessors": ["B", "C", "D"], "zoning": "None", "custom_attributes": {}},
        {"id": "F", "name": "Firmware Flashing & Calibration", "time": 25.0, "predecessors": ["E"], "zoning": "None", "custom_attributes": {}},
        {"id": "G", "name": "Chassis Housing Assembly", "time": 14.0, "predecessors": ["F"], "zoning": "None", "custom_attributes": {}},
        {"id": "H", "name": "Final QA, Testing & Packaging", "time": 16.0, "predecessors": ["G"], "zoning": "None", "custom_attributes": {}}
    ]

    # 2. Define standard PDF config
    oscilloscope_config = {
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
            {"key": "currency_symbol", "label": "Currency Symbol", "value": 0.0, "unit": "₹", "category": "General"}
        ],
        "formulas": {
            "TaktTime": "shift_time / demand",
            "MonthlyProfit": "demand * work_days * (unit_price - unit_cost)",
            "ROI_Efficiency": "MonthlyProfit * 0.10"
        },
        "custom_zones": [],
        "zone_exclusions": {},
        "target_efficiency": 85,
        "updatedAt": datetime.now(timezone.utc).isoformat()
    }

    opto_data = {
        "config": oscilloscope_config,
        "tasks": oscilloscope_tasks
    }
    
    output_path = os.path.join(os.path.dirname(__file__), "..", "release", "demo_factory_line.opto")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(opto_data, f, indent=4)
        
    print(f"[SUCCESS] Demo file generated at: {output_path}")

if __name__ == "__main__":
    generate_demo_opto()
