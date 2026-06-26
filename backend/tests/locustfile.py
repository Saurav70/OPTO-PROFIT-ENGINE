"""
OPTO-PROFIT Load & Performance Test Suite
==========================================
Uses Locust to benchmark the two highest-load API endpoints:
  - GET  /api/tasks          (read-heavy; real-time task list fetching)
  - POST /api/analytics/roi  (compute-heavy; financial projection)

Target: 100 concurrent users, 10 user ramp-up per second.

Usage (headless CI mode):
    cd backend
    locust -f tests/locustfile.py --headless \
           -u 100 -r 10 --run-time 60s \
           --host http://localhost:8000 \
           --html tests/reports/load_report.html

Usage (interactive Locust web UI):
    locust -f tests/locustfile.py --host http://localhost:8000
    # Open http://localhost:8089 in browser

Requirements:
    pip install locust
    Backend must be running: uvicorn app.main:app --host 0.0.0.0 --port 8000

Environment variables (optional override):
    LOCUST_TEST_USERNAME   → username to register/login (default: locust_perf_user)
    LOCUST_TEST_PASSWORD   → password                   (default: LocustPerf1234!)
    LOCUST_TEST_EMAIL      → email                      (default: locust@perf.test)
"""

import json
import os
import time

from locust import HttpUser, SequentialTaskSet, between, task, events


# ── Shared token cache (set once per worker process on startup) ───────────────
_shared_token: str | None = None
_shared_tasks: list = []

# Default test credentials (override via env vars for CI secrets)
TEST_USERNAME = os.getenv("LOCUST_TEST_USERNAME", "locust_perf_user")
TEST_PASSWORD = os.getenv("LOCUST_TEST_PASSWORD", "LocustPerf1234!")
TEST_EMAIL    = os.getenv("LOCUST_TEST_EMAIL",    "locust@perf.test")

# Realistic ROI payload matching the production analytics/roi schema
ROI_PAYLOAD = {
    "config": {
        "variables": [
            {"key": "shift_time",            "value": 480.0},
            {"key": "demand",                "value": 16.0},
            {"key": "unit_price",            "value": 25000.0},
            {"key": "unit_cost",             "value": 15000.0},
            {"key": "work_days",             "value": 25.0},
            {"key": "current_cycle_time",    "value": 35.0},
            {"key": "current_operators",     "value": 5.0},
            {"key": "operator_cost_per_hour","value": 150.0},
            {"key": "investment_cost",       "value": 25000.0},
        ]
    },
    "optimization": {
        "nActual": 5,
        "actualCycleTime": 29.0,
        "efficiency": "86.67",
    },
    "tasks": [
        {"id": "A", "time": 12.0},
        {"id": "B", "time": 18.0},
        {"id": "C", "time": 15.0},
        {"id": "D", "time": 10.0},
        {"id": "E", "time": 8.0},
        {"id": "F", "time": 20.0},
        {"id": "G", "time": 14.0},
        {"id": "H", "time": 16.0},
        {"id": "I", "time": 22.0},
        {"id": "J", "time": 10.0},
    ],
}


# ── Locust startup event: provision shared auth token ────────────────────────
@events.init.add_listener
def on_locust_init(environment, **kwargs):
    """
    Runs once before any simulated users start.
    Registers a test account and stores the Bearer token globally so all
    virtual users share the same authenticated session without hammering /register.
    """
    global _shared_token, _shared_tasks

    host = environment.host or "http://localhost:8000"

    import requests  # stdlib requests for the one-time bootstrap

    # 1. Try to register (ignore 400 if user already exists)
    requests.post(f"{host}/api/auth/register", json={
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD,
        "email": TEST_EMAIL,
    }, timeout=10)

    # 2. Login to obtain a fresh token
    login_res = requests.post(f"{host}/api/auth/login", json={
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD,
    }, timeout=10)

    if login_res.status_code == 200:
        _shared_token = login_res.json().get("access_token")
        print(f"\n[Locust Init] Auth token acquired for '{TEST_USERNAME}'.")
    else:
        print(f"\n[Locust Init] WARNING: Could not obtain auth token. "
              f"Status: {login_res.status_code}. "
              f"Unauthenticated requests will fail.")


# ── Task Set: Read-Heavy Scenario (GET /api/tasks) ───────────────────────────
class TaskListTaskSet(SequentialTaskSet):
    """
    Simulates a user continuously polling the task list — typical of the
    Process Planning module auto-save pattern.
    Weight: 3 (3× more frequent than the compute-heavy ROI endpoint)
    """

    def on_start(self):
        self.headers = {"Authorization": f"Bearer {_shared_token}"} if _shared_token else {}

    @task(3)
    def get_task_list(self):
        """GET /api/tasks — benchmark read latency under concurrent load."""
        with self.client.get(
            "/api/tasks",
            headers=self.headers,
            name="GET /api/tasks",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            elif resp.status_code == 401:
                resp.failure("Unauthenticated — check token provisioning")
            else:
                resp.failure(f"Unexpected status: {resp.status_code}")

    @task(1)
    def get_config(self):
        """GET /api/config — config is fetched alongside tasks in most flows."""
        with self.client.get(
            "/api/config",
            headers=self.headers,
            name="GET /api/config",
            catch_response=True,
        ) as resp:
            if resp.status_code in (200, 422):
                resp.success()
            else:
                resp.failure(f"Unexpected status: {resp.status_code}")


# ── Task Set: Compute-Heavy Scenario (POST /api/analytics/roi) ───────────────
class ROIComputeTaskSet(SequentialTaskSet):
    """
    Simulates the Financial Analytics module submitting ROI calculations.
    The backend runs pure-Python AST formula evaluation on every request.
    Weight: 1 (heavier computation — less frequent than reads)
    """

    def on_start(self):
        self.headers = {
            "Authorization": f"Bearer {_shared_token}",
            "Content-Type": "application/json",
        } if _shared_token else {}

    @task(1)
    def post_roi_calculation(self):
        """POST /api/analytics/roi — benchmark CPU-bound formula evaluation."""
        with self.client.post(
            "/api/analytics/roi",
            json=ROI_PAYLOAD,
            headers=self.headers,
            name="POST /api/analytics/roi",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                data = resp.json()
                # Validate response shape
                if "monthlyProfit" not in data:
                    resp.failure("Response missing 'monthlyProfit' field")
                else:
                    resp.success()
            elif resp.status_code == 401:
                resp.failure("Unauthenticated — check token provisioning")
            else:
                resp.failure(f"Unexpected status: {resp.status_code} | {resp.text[:200]}")


# ── Mixed Virtual User Profile ────────────────────────────────────────────────
class OptoprofitUser(HttpUser):
    """
    Simulates a realistic OPTO-PROFIT user session:
      - 75% of time: reading task lists (Process Planning / Dashboard refresh)
      - 25% of time: triggering ROI computation (Financial Analytics)

    Wait time between tasks: 1–3 seconds (realistic think time).
    Target: 100 concurrent users, ramp 10/second.
    """
    wait_time = between(1, 3)
    tasks = {
        TaskListTaskSet: 3,   # 75% weight
        ROIComputeTaskSet: 1, # 25% weight
    }

    def on_start(self):
        """Called once per virtual user on spawn."""
        self.client.headers.update({
            "Authorization": f"Bearer {_shared_token}" if _shared_token else ""
        })


# ── SLA Thresholds (printed in console; enforced in CI via --exit-code-on-error) ──
@events.quitting.add_listener
def on_quitting(environment, **kwargs):
    """
    After the load test completes, validate against SLA thresholds:
      - p95 response time for GET /api/tasks       ≤ 200ms
      - p95 response time for POST /api/analytics/roi ≤ 500ms
      - Failure rate                               < 1%
    """
    stats = environment.stats

    print("\n" + "=" * 60)
    print("OPTO-PROFIT LOAD TEST — SLA VALIDATION REPORT")
    print("=" * 60)

    sla_breaches = []

    for entry in stats.entries.values():
        name = entry.name
        p95  = entry.get_response_time_percentile(0.95)
        fail = entry.num_failures
        reqs = entry.num_requests
        fail_rate = (fail / reqs * 100) if reqs > 0 else 0

        print(f"\n  Endpoint : {name}")
        print(f"  Requests : {reqs}")
        print(f"  Failures : {fail} ({fail_rate:.2f}%)")
        print(f"  p95 (ms) : {p95:.1f}")

        # Apply SLA thresholds
        if "GET /api/tasks" in name and p95 > 200:
            sla_breaches.append(f"BREACH: {name} p95={p95:.1f}ms > 200ms SLA")
        if "POST /api/analytics/roi" in name and p95 > 500:
            sla_breaches.append(f"BREACH: {name} p95={p95:.1f}ms > 500ms SLA")
        if fail_rate > 1.0:
            sla_breaches.append(f"BREACH: {name} failure rate={fail_rate:.2f}% > 1% SLA")

    print("\n" + "-" * 60)
    if sla_breaches:
        print("❌ SLA VIOLATIONS DETECTED:")
        for breach in sla_breaches:
            print(f"   {breach}")
        environment.process_exit_code = 1
    else:
        print("✅ All endpoints passed SLA thresholds.")
    print("=" * 60 + "\n")
