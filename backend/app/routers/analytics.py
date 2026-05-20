import ast
import operator

from fastapi import APIRouter
from typing import Dict, Any

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

BIN_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
}

UNARY_OPS = {
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
}

COMPARE_OPS = {
    ast.Eq: operator.eq,
    ast.NotEq: operator.ne,
    ast.Lt: operator.lt,
    ast.LtE: operator.le,
    ast.Gt: operator.gt,
    ast.GtE: operator.ge,
}


def _get_variable_map(config: Dict[str, Any]) -> Dict[str, float]:
    variables = config.get("variables") or []
    result: Dict[str, float] = {}
    for variable in variables:
        key = variable.get("key")
        if not key:
            continue
        try:
            result[key] = float(variable.get("value", 0))
        except (TypeError, ValueError):
            result[key] = 0
    return result


def _split_top_level_ternary(formula: str) -> tuple[str, str, str] | None:
    question_idx = -1
    colon_idx = -1
    depth = 0

    for idx, char in enumerate(formula):
        if char == "(":
            depth += 1
        elif char == ")":
            depth = max(0, depth - 1)
        elif char == "?" and question_idx == -1:
            question_idx = idx
        elif char == ":" and question_idx != -1 and depth == 0:
            colon_idx = idx
            break

    if question_idx == -1 or colon_idx == -1:
        return None
    return (
        formula[:question_idx].strip(),
        formula[question_idx + 1:colon_idx].strip(),
        formula[colon_idx + 1:].strip(),
    )


def _normalize_formula(formula: str) -> str:
    formula = formula.replace("÷", "/").replace("×", "*").strip()
    ternary = _split_top_level_ternary(formula)
    if ternary:
        condition, truthy, falsy = ternary
        return f"({truthy}) if ({condition}) else ({falsy})"
    return formula


def _eval_node(node: ast.AST, context: Dict[str, float]) -> float | bool:
    if isinstance(node, ast.Expression):
        return _eval_node(node.body, context)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float, bool)):
        return node.value
    if isinstance(node, ast.Name):
        return context.get(node.id, 0)
    if isinstance(node, ast.BinOp) and type(node.op) in BIN_OPS:
        return BIN_OPS[type(node.op)](_eval_node(node.left, context), _eval_node(node.right, context))
    if isinstance(node, ast.UnaryOp) and type(node.op) in UNARY_OPS:
        return UNARY_OPS[type(node.op)](_eval_node(node.operand, context))
    if isinstance(node, ast.Compare):
        left = _eval_node(node.left, context)
        for op, comparator in zip(node.ops, node.comparators):
            right = _eval_node(comparator, context)
            if type(op) not in COMPARE_OPS or not COMPARE_OPS[type(op)](left, right):
                return False
            left = right
        return True
    if isinstance(node, ast.IfExp):
        return _eval_node(node.body if _eval_node(node.test, context) else node.orelse, context)
    raise ValueError(f"Unsupported formula expression: {ast.dump(node)}")


def evaluate_formula(formula: str | None, context: Dict[str, float]) -> float:
    if not formula:
        return 0
    try:
        parsed = ast.parse(_normalize_formula(formula), mode="eval")
        result = _eval_node(parsed, context)
        return float(result) if isinstance(result, (int, float, bool)) else 0
    except Exception:
        return 0

@router.post("/roi")
async def get_roi_impact(payload: Dict[str, Any]):
    """
    Dynamic ROI calculation aligned to the frontend variable/formula model.
    """
    config = payload.get("config", {})
    optimization = payload.get("optimization", {})
    tasks = payload.get("tasks", [])
    context = _get_variable_map(config)
    shift_time = context.get("shift_time", 0)
    demand = context.get("demand", 0)
    unit_price = context.get("unit_price", 0)
    unit_cost = context.get("unit_cost", 0)
    work_days = context.get("work_days", 0)
    current_cycle_time = context.get("current_cycle_time", 0)
    current_operators = context.get("current_operators", 0)
    operator_cost_per_hour = context.get("operator_cost_per_hour", 0)
    investment_cost = context.get("investment_cost", 0)

    context.update({
        "total_task_time": sum(float(task.get("time", 0) or 0) for task in tasks),
        "n_actual": float(optimization.get("nActual") or 0),
        "takt_time": shift_time / demand if demand > 0 else 0,
    })

    optimized_cycle_time = float(optimization.get("actualCycleTime") or context["takt_time"] or 0)
    optimized_operators = float(optimization.get("nActual") or 0)
    contribution_margin = unit_price - unit_cost
    labor_hours_per_day = shift_time / 60 if shift_time > 0 else 0

    def daily_output(cycle_time: float) -> float:
        if shift_time <= 0 or cycle_time <= 0 or demand <= 0:
            return 0
        return min(demand, shift_time // cycle_time)

    baseline_daily_production = daily_output(current_cycle_time)
    optimized_daily_production = daily_output(optimized_cycle_time)
    baseline_labor_cost = current_operators * operator_cost_per_hour * labor_hours_per_day * work_days
    optimized_labor_cost = optimized_operators * operator_cost_per_hour * labor_hours_per_day * work_days
    baseline_monthly_profit = (baseline_daily_production * work_days * contribution_margin) - baseline_labor_cost
    monthly_profit = (optimized_daily_production * work_days * contribution_margin) - optimized_labor_cost
    profit_increase = monthly_profit - baseline_monthly_profit
    payback_months = investment_cost / profit_increase if profit_increase > 0 and investment_cost > 0 else 0

    return {
        "monthlyProfit": monthly_profit,
        "profitIncrease": profit_increase,
        "dailyProduction": optimized_daily_production,
        "baselineDailyProduction": baseline_daily_production,
        "baselineMonthlyProfit": baseline_monthly_profit,
        "optimizedMonthlyProfit": monthly_profit,
        "baselineLaborCost": baseline_labor_cost,
        "optimizedLaborCost": optimized_labor_cost,
        "paybackMonths": payback_months,
        "investmentCost": investment_cost,
        "status": "calculated"
    }
