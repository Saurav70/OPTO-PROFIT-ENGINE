import unittest

from app.routers.analytics import evaluate_formula, get_roi_impact


class AnalyticsRoiTest(unittest.IsolatedAsyncioTestCase):
    def test_formula_evaluator_supports_project_ternary(self) -> None:
        context = {"demand": 60, "MonthlyProfit": 1000}

        result = evaluate_formula(
            "(demand > 50) ? (MonthlyProfit * 0.15) : (MonthlyProfit * 0.10)",
            context,
        )

        self.assertEqual(result, 150)

    async def test_roi_compares_baseline_and_optimized_profit(self) -> None:
        payload = {
            "tasks": [
                {"id": "A", "time": 12},
                {"id": "B", "time": 18},
            ],
            "config": {
                "variables": [
                    {"key": "shift_time", "value": 480},
                    {"key": "demand", "value": 16},
                    {"key": "unit_price", "value": 1000},
                    {"key": "unit_cost", "value": 600},
                    {"key": "work_days", "value": 25},
                    {"key": "current_cycle_time", "value": 40},
                    {"key": "current_operators", "value": 6},
                    {"key": "operator_cost_per_hour", "value": 100},
                    {"key": "investment_cost", "value": 10000},
                ],
            },
            "optimization": {
                "actualCycleTime": 30,
                "nActual": 5,
            },
        }

        result = await get_roi_impact(payload)

        self.assertEqual(result["baselineDailyProduction"], 12)
        self.assertEqual(result["dailyProduction"], 16)
        self.assertEqual(result["baselineLaborCost"], 120000)
        self.assertEqual(result["optimizedLaborCost"], 100000)
        self.assertEqual(result["baselineMonthlyProfit"], 0)
        self.assertEqual(result["monthlyProfit"], 60000)
        self.assertEqual(result["profitIncrease"], 60000)
        self.assertAlmostEqual(result["paybackMonths"], 0.1667, places=4)


if __name__ == "__main__":
    unittest.main()
