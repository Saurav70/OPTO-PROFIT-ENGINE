from fastapi import APIRouter, Depends
from typing import Dict, Any
from ..models import Task, Config

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

def calculate_daily_production(shift_time: float, cycle_time: float, demand: float) -> float:
    if shift_time <= 0 or cycle_time <= 0 or demand <= 0:
        return 0
    return min(demand, shift_time // cycle_time)

@router.post("/roi")
async def get_roi_impact(payload: Dict[str, Any]):
    """
    OPTOPROFIT - Industrial ROI Calculation Engine
    Derived from TEIRAC Industrial Standards.
    """
    config = payload.get("config", {})
    optimization = payload.get("optimization", {})
    
    shift_time = float(config.get("shiftTime", 480))
    demand = float(config.get("demand", 1))
    unit_price = float(config.get("unitPrice", 0))
    unit_cost = float(config.get("unitCost", 0))
    work_days = float(config.get("workDaysPerMonth", 25))
    
    contribution_margin = unit_price - unit_cost
    
    # Baseline
    baseline_cycle_time = float(config.get("currentCycleTime", 35))
    baseline_daily_prod = calculate_daily_production(shift_time, baseline_cycle_time, demand)
    baseline_monthly_profit = baseline_daily_prod * work_days * contribution_margin
    
    # Optimized
    opt_cycle_time = float(optimization.get("actualCycleTime", baseline_cycle_time))
    opt_daily_prod = calculate_daily_production(shift_time, opt_cycle_time, demand)
    opt_monthly_profit = opt_daily_prod * work_days * contribution_margin
    
    return {
        "monthlyProfit": opt_monthly_profit,
        "profitIncrease": opt_monthly_profit - baseline_monthly_profit,
        "dailyProduction": opt_daily_prod,
        "status": "calculated"
    }
