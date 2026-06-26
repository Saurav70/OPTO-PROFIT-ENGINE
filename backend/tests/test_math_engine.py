"""
Test suite for app.math_engine
===============================
Validates the three core industrial engineering calculations used
throughout OPTO-PROFIT: Takt Time, Target Cycle Time, and
Theoretical Balance Index.

Run with:  python -m unittest tests/test_math_engine.py -v
"""

import math
import unittest

from app.math_engine import (
    takt_time,
    target_cycle_time,
    theoretical_balance_index,
)


# ══════════════════════════════════════════════════════════════════
#  Takt Time
# ══════════════════════════════════════════════════════════════════

class TestTaktTime(unittest.TestCase):
    """T_takt = shift_time / demand"""

    def test_basic_calculation(self):
        # 480 min shift ÷ 16 units = 30 min/unit
        self.assertEqual(takt_time(480, 16), 30.0)

    def test_fractional_result(self):
        # 480 min ÷ 7 units ≈ 68.571…
        result = takt_time(480, 7)
        self.assertTrue(math.isclose(result, 480 / 7, rel_tol=1e-9))

    def test_single_unit_demand(self):
        # Demand of 1 → takt equals entire shift
        self.assertEqual(takt_time(480, 1), 480.0)

    def test_high_demand(self):
        # 480 min ÷ 480 units = 1 min/unit
        self.assertEqual(takt_time(480, 480), 1.0)

    def test_small_shift_time(self):
        self.assertEqual(takt_time(60, 10), 6.0)

    def test_invalid_inputs_raise_value_error(self):
        cases = [
            (0, 16),
            (-480, 16),
            (480, 0),
            (480, -1),
            (0, 0),
            (-1, -1),
        ]
        for shift, demand in cases:
            with self.subTest(shift=shift, demand=demand):
                with self.assertRaises(ValueError):
                    takt_time(shift, demand)


# ══════════════════════════════════════════════════════════════════
#  Target Cycle Time
# ══════════════════════════════════════════════════════════════════

class TestTargetCycleTime(unittest.TestCase):
    """T_target = T_takt × (target_efficiency / 100)"""

    def test_default_efficiency(self):
        # Takt = 30 min, default 85 % → 25.5 min
        result = target_cycle_time(480, 16)
        self.assertTrue(math.isclose(result, 25.5, rel_tol=1e-9))

    def test_full_efficiency(self):
        # 100 % efficiency → target == takt
        result = target_cycle_time(480, 16, target_efficiency=100.0)
        self.assertTrue(math.isclose(result, 30.0, rel_tol=1e-9))

    def test_low_efficiency(self):
        # 50 % efficiency → half of takt
        result = target_cycle_time(480, 16, target_efficiency=50.0)
        self.assertTrue(math.isclose(result, 15.0, rel_tol=1e-9))

    def test_custom_efficiency_70(self):
        # Takt = 30 min × 0.70 = 21.0 min
        result = target_cycle_time(480, 16, target_efficiency=70.0)
        self.assertTrue(math.isclose(result, 21.0, rel_tol=1e-9))

    def test_invalid_efficiency_raises(self):
        cases = [0, -10, 101, 200]
        for eff in cases:
            with self.subTest(eff=eff):
                with self.assertRaises(ValueError):
                    target_cycle_time(480, 16, target_efficiency=eff)

    def test_propagates_takt_time_errors(self):
        with self.assertRaises(ValueError):
            target_cycle_time(0, 16, target_efficiency=85)


# ══════════════════════════════════════════════════════════════════
#  Theoretical Balance Index
# ══════════════════════════════════════════════════════════════════

class TestTheoreticalBalanceIndex(unittest.TestCase):
    """η = Σ(task_times) / (num_stations × cycle_time) × 100"""

    def test_perfect_balance(self):
        # 3 tasks of 10 min each, 3 stations, cycle = 10 → 100 %
        result = theoretical_balance_index([10, 10, 10], 3, 10)
        self.assertTrue(math.isclose(result, 100.0, rel_tol=1e-9))

    def test_default_scenario(self):
        # From DEFAULT_TASKS: total = 12+18+15+10+20+25+14+16 = 130 min
        # If 5 stations, cycle_time = 30 → η = 130/(5×30)×100 = 86.67 %
        tasks = [12, 18, 15, 10, 20, 25, 14, 16]
        result = theoretical_balance_index(tasks, 5, 30)
        self.assertTrue(math.isclose(result, 86.6667, rel_tol=1e-3))

    def test_underbalanced_line(self):
        # Total = 30, 3 stations × cycle 20 = 60 → η = 50 %
        result = theoretical_balance_index([10, 10, 10], 3, 20)
        self.assertTrue(math.isclose(result, 50.0, rel_tol=1e-9))

    def test_over_100_percent(self):
        # If cycle_time is less than average, balance > 100 %
        # Total = 30, 2 stations × 10 = 20 → 150 %
        result = theoretical_balance_index([10, 10, 10], 2, 10)
        self.assertTrue(math.isclose(result, 150.0, rel_tol=1e-9))

    def test_single_station(self):
        # 1 station, cycle = total → 100 %
        result = theoretical_balance_index([5, 10, 15], 1, 30)
        self.assertTrue(math.isclose(result, 100.0, rel_tol=1e-9))

    def test_task_with_zero_time(self):
        # A zero-duration task is valid (e.g., inspection milestone)
        result = theoretical_balance_index([10, 0, 10], 2, 10)
        self.assertTrue(math.isclose(result, 100.0, rel_tol=1e-9))

    def test_empty_task_list_raises(self):
        with self.assertRaises(ValueError):
            theoretical_balance_index([], 3, 10)

    def test_negative_task_time_raises(self):
        with self.assertRaises(ValueError):
            theoretical_balance_index([10, -5, 10], 3, 10)

    def test_zero_stations_raises(self):
        with self.assertRaises(ValueError):
            theoretical_balance_index([10, 10], 0, 10)

    def test_zero_cycle_time_raises(self):
        with self.assertRaises(ValueError):
            theoretical_balance_index([10, 10], 2, 0)


if __name__ == "__main__":
    unittest.main()
