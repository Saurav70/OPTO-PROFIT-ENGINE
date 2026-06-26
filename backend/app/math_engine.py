"""
OPTO-PROFIT Math Engine
=======================
Pure-function industrial engineering calculations used across the
Line Optimization and Dashboard modules.

All inputs are in consistent metric units:
  - Time  → minutes (min)
  - Demand → units per shift

These functions are intentionally dependency-free so they can be
unit-tested without any database or framework imports.
"""

from __future__ import annotations


# ── Takt Time ────────────────────────────────────────────────────
def takt_time(shift_time: float, demand: float) -> float:
    """Calculate Takt Time — the maximum allowable cycle time to meet demand.

    Formula:  T_takt = shift_time / demand

    Args:
        shift_time: Available production time per shift (min).  Must be > 0.
        demand:     Number of units required per shift.          Must be > 0.

    Returns:
        Takt time in minutes.

    Raises:
        ValueError: If either argument is zero or negative.
    """
    if shift_time <= 0:
        raise ValueError(f"shift_time must be > 0, got {shift_time}")
    if demand <= 0:
        raise ValueError(f"demand must be > 0, got {demand}")
    return shift_time / demand


# ── Target Cycle Time ────────────────────────────────────────────
def target_cycle_time(
    shift_time: float,
    demand: float,
    target_efficiency: float = 85.0,
) -> float:
    """Derive the Target Cycle Time from Takt Time and a target efficiency %.

    Formula:  T_target = T_takt × (target_efficiency / 100)

    A lower target_efficiency creates a tighter cycle time, building in
    buffer for real-world variability (changeovers, micro-stops, etc.).

    Args:
        shift_time:        Available production time per shift (min).
        demand:            Units required per shift.
        target_efficiency: Desired line efficiency as a percentage (0–100].

    Returns:
        Target cycle time in minutes.

    Raises:
        ValueError: If any argument is zero / negative, or efficiency > 100.
    """
    if target_efficiency <= 0 or target_efficiency > 100:
        raise ValueError(
            f"target_efficiency must be in (0, 100], got {target_efficiency}"
        )
    t_takt = takt_time(shift_time, demand)
    return t_takt * (target_efficiency / 100.0)


# ── Theoretical Balance Index ────────────────────────────────────
def theoretical_balance_index(
    task_times: list[float],
    num_stations: int,
    cycle_time: float,
) -> float:
    """Compute the Theoretical Balance Index (line efficiency).

    Formula:  η = Σ(task_times) / (num_stations × cycle_time) × 100

    A perfect balance yields 100 %; anything below indicates idle time
    across the stations.

    Args:
        task_times:   List of individual task durations (min).  All must be ≥ 0.
        num_stations: Number of workstations on the line.       Must be > 0.
        cycle_time:   Cycle time of the bottleneck station (min). Must be > 0.

    Returns:
        Balance index as a percentage (0–100+).

    Raises:
        ValueError: If inputs violate the constraints above.
    """
    if not task_times:
        raise ValueError("task_times must be a non-empty list")
    if any(t < 0 for t in task_times):
        raise ValueError("All task_times must be ≥ 0")
    if num_stations <= 0:
        raise ValueError(f"num_stations must be > 0, got {num_stations}")
    if cycle_time <= 0:
        raise ValueError(f"cycle_time must be > 0, got {cycle_time}")

    total = sum(task_times)
    return (total / (num_stations * cycle_time)) * 100.0
