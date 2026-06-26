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

        result = get_roi_impact(payload)

        self.assertEqual(result["baselineDailyProduction"], 12)
        self.assertEqual(result["dailyProduction"], 16)
        self.assertEqual(result["baselineLaborCost"], 120000)
        self.assertEqual(result["optimizedLaborCost"], 100000)
        self.assertEqual(result["baselineMonthlyProfit"], 0)
        self.assertEqual(result["monthlyProfit"], 60000)
        self.assertEqual(result["profitIncrease"], 60000)
        self.assertAlmostEqual(result["paybackMonths"], 0.1667, places=4)

    async def test_roi_dataset_heavy_machinery(self) -> None:
        """Case 1: Low-Volume, High-Value assembly line (Heavy Equipment)."""
        payload = {
            "tasks": [{"id": f"T{i}", "time": 10} for i in range(10)],
            "config": {
                "variables": [
                    {"key": "shift_time", "value": 480},
                    {"key": "demand", "value": 5},
                    {"key": "unit_price", "value": 500000},
                    {"key": "unit_cost", "value": 300000},
                    {"key": "work_days", "value": 20},
                    {"key": "current_cycle_time", "value": 120},
                    {"key": "current_operators", "value": 12},
                    {"key": "operator_cost_per_hour", "value": 500},
                    {"key": "investment_cost", "value": 2000000},
                ],
            },
            "optimization": {
                "actualCycleTime": 96,
                "nActual": 8,
            },
        }

        result = get_roi_impact(payload)

        # Baseline Daily Production = min(5, 480 // 120) = 4
        # Optimized Daily Production = min(5, 480 // 96) = 5
        self.assertEqual(result["baselineDailyProduction"], 4)
        self.assertEqual(result["dailyProduction"], 5)
        
        # Baseline Labor: 12 ops * 500/hr * 8 hrs * 20 days = 960,000
        # Optimized Labor: 8 ops * 500/hr * 8 hrs * 20 days = 640,000
        self.assertEqual(result["baselineLaborCost"], 960000)
        self.assertEqual(result["optimizedLaborCost"], 640000)

        # Baseline Profit: (4 units * 20 days * 200,000 margin) - 960,000 labor = 15,040,000
        # Optimized Profit: (5 units * 20 days * 200,000 margin) - 640,000 labor = 19,360,000
        # Profit Increase = 4,320,000
        # Payback Months = 2,000,000 / 4,320,000 = 0.4630
        self.assertEqual(result["baselineMonthlyProfit"], 15040000)
        self.assertEqual(result["optimizedMonthlyProfit"], 19360000)
        self.assertEqual(result["profitIncrease"], 4320000)
        self.assertAlmostEqual(result["paybackMonths"], 0.4630, places=4)

    async def test_roi_dataset_consumer_electronics(self) -> None:
        """Case 2: High-Volume, Low-Margin assembly line (Consumer Electronics)."""
        payload = {
            "tasks": [{"id": f"T{i}", "time": 0.1} for i in range(15)],
            "config": {
                "variables": [
                    {"key": "shift_time", "value": 960},  # Two shifts
                    {"key": "demand", "value": 1200},
                    {"key": "unit_price", "value": 150},
                    {"key": "unit_cost", "value": 90},
                    {"key": "work_days", "value": 26},
                    {"key": "current_cycle_time", "value": 1.2},
                    {"key": "current_operators", "value": 45},
                    {"key": "operator_cost_per_hour", "value": 120},
                    {"key": "investment_cost", "value": 500000},
                ],
            },
            "optimization": {
                "actualCycleTime": 0.8,
                "nActual": 35,
            },
        }

        result = get_roi_impact(payload)

        # Baseline Daily Production = min(1200, 960 // 1.2) = 800
        # Optimized Daily Production = min(1200, 960 // 0.8) = 1200
        self.assertEqual(result["baselineDailyProduction"], 800)
        self.assertEqual(result["dailyProduction"], 1200)

        # Baseline Labor: 45 ops * 120/hr * 16 hrs * 26 days = 2,246,400
        # Optimized Labor: 35 ops * 120/hr * 16 hrs * 26 days = 1,747,200
        self.assertEqual(result["baselineLaborCost"], 2246400)
        self.assertEqual(result["optimizedLaborCost"], 1747200)

        # Baseline Profit: (800 * 26 * 60) - 2,246,400 = -998,400
        # Optimized Profit: (1200 * 26 * 60) - 1,747,200 = 124,800
        # Profit Increase = 1,123,200
        # Payback Months = 500,000 / 1,123,200 = 0.4452
        self.assertEqual(result["baselineMonthlyProfit"], -998400)
        self.assertEqual(result["optimizedMonthlyProfit"], 124800)
        self.assertEqual(result["profitIncrease"], 1123200)
        self.assertAlmostEqual(result["paybackMonths"], 0.4452, places=4)

    async def test_roi_dataset_automotive(self) -> None:
        """Case 3: Automated Assembly Line with High Capital Investment (Automotive)."""
        payload = {
            "tasks": [{"id": f"T{i}", "time": 0.5} for i in range(12)],
            "config": {
                "variables": [
                    {"key": "shift_time", "value": 480},
                    {"key": "demand", "value": 80},
                    {"key": "unit_price", "value": 4500},
                    {"key": "unit_cost", "value": 2500},
                    {"key": "work_days", "value": 22},
                    {"key": "current_cycle_time", "value": 8},
                    {"key": "current_operators", "value": 15},
                    {"key": "operator_cost_per_hour", "value": 250},
                    {"key": "investment_cost", "value": 5000000},
                ],
            },
            "optimization": {
                "actualCycleTime": 6,
                "nActual": 8,
            },
        }

        result = get_roi_impact(payload)

        # Baseline Daily Production = min(80, 480 // 8) = 60
        # Optimized Daily Production = min(80, 480 // 6) = 80
        self.assertEqual(result["baselineDailyProduction"], 60)
        self.assertEqual(result["dailyProduction"], 80)

        # Baseline Labor: 15 ops * 250/hr * 8 hrs * 22 days = 660,000
        # Optimized Labor: 8 ops * 250/hr * 8 hrs * 22 days = 352,000
        self.assertEqual(result["baselineLaborCost"], 660000)
        self.assertEqual(result["optimizedLaborCost"], 352000)

        # Baseline Profit: (60 * 22 * 2000) - 660,000 = 1,980,000
        # Optimized Profit: (80 * 22 * 2000) - 352,000 = 3,168,000
        # Profit Increase = 1,188,000
        # Payback Months = 5,000,000 / 1,188,000 = 4.2088
        self.assertEqual(result["baselineMonthlyProfit"], 1980000)
        self.assertEqual(result["optimizedMonthlyProfit"], 3168000)
        self.assertEqual(result["profitIncrease"], 1188000)
        self.assertAlmostEqual(result["paybackMonths"], 4.2088, places=4)


if __name__ == "__main__":
    unittest.main()
