"""
Integration tests for the OPTO-PROFIT authentication flow.

Covers: register, login, me, logout, change-password, forgot-password,
        reset-password, and duplicate-username rejection.

These tests require a running MongoDB instance (defaults to localhost:27017).
They use a dedicated test database that is dropped after tests complete.
"""
import os
import unittest

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# SQLite test database session override
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db

TEST_DATABASE_URL = "sqlite:///./test_optoprofit.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()

# pyrefly: ignore [missing-import]
from httpx import AsyncClient, ASGITransport

from app.main import app


class AuthFlowTest(unittest.IsolatedAsyncioTestCase):
    """End-to-end tests for the /api/auth/* endpoints."""

    BASE = "http://testserver"

    async def asyncSetUp(self):
        """Trigger the lifespan startup by entering the ASGI app lifecycle."""
        # Override the database dependency in FastAPI
        app.dependency_overrides[get_db] = override_get_db
        
        # Disable rate limiting for integration tests
        app.state.limiter.enabled = False

        # Create all tables in the test database
        from app.sql_models import UserDB  # ensure model registry
        Base.metadata.create_all(bind=test_engine)
        
        self._ctx = app.router.lifespan_context(app)
        await self._ctx.__aenter__()

    async def asyncTearDown(self):
        """Clean up test users and trigger lifespan shutdown."""
        await self._ctx.__aexit__(None, None, None)
        # Re-enable rate limiting
        app.state.limiter.enabled = True

        # Drop all tables to clean up and avoid state pollution
        Base.metadata.drop_all(bind=test_engine)
        # Remove the override
        app.dependency_overrides.pop(get_db, None)
        
        # Delete the test DB file if it exists
        if os.path.exists("./test_optoprofit.db"):
            try:
                os.remove("./test_optoprofit.db")
            except OSError:
                pass

    def _transport(self):
        return ASGITransport(app=app)

    # ── Register ──────────────────────────────────────────────────

    async def test_register_creates_user_and_returns_token(self):
        async with AsyncClient(transport=self._transport(), base_url=self.BASE) as c:
            res = await c.post("/api/auth/register", json={
                "username": "testuser_flow",
                "password": "StrongPass123!",
                "email": "flow@test.com",
            })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["token_type"], "bearer")

    async def test_register_rejects_short_username(self):
        async with AsyncClient(transport=self._transport(), base_url=self.BASE) as c:
            res = await c.post("/api/auth/register", json={
                "username": "ab",
                "password": "StrongPass123!",
            })
        self.assertEqual(res.status_code, 422)  # Pydantic validation

    async def test_register_rejects_short_password(self):
        async with AsyncClient(transport=self._transport(), base_url=self.BASE) as c:
            res = await c.post("/api/auth/register", json={
                "username": "shortpw_user",
                "password": "short",
            })
        self.assertEqual(res.status_code, 422)  # Pydantic min_length

    async def test_register_rejects_invalid_email(self):
        async with AsyncClient(transport=self._transport(), base_url=self.BASE) as c:
            res = await c.post("/api/auth/register", json={
                "username": "invalid_email_user",
                "password": "StrongPass123!",
                "email": "not-an-email",
            })
        self.assertEqual(res.status_code, 422)  # EmailStr validation

    # ── Login ─────────────────────────────────────────────────────

    async def test_login_invalid_credentials(self):
        async with AsyncClient(transport=self._transport(), base_url=self.BASE) as c:
            res = await c.post("/api/auth/login", json={
                "username": "nonexistent_user",
                "password": "WrongPassword1",
            })
        self.assertEqual(res.status_code, 401)

    # ── /me & Logout ──────────────────────────────────────────────

    async def test_me_requires_auth(self):
        async with AsyncClient(transport=self._transport(), base_url=self.BASE) as c:
            res = await c.get("/api/auth/me")
        self.assertEqual(res.status_code, 401)

    async def test_full_register_login_me_logout_cycle(self):
        async with AsyncClient(transport=self._transport(), base_url=self.BASE) as c:
            # Register
            reg = await c.post("/api/auth/register", json={
                "username": "cycle_user",
                "password": "CyclePass!123",
                "email": "cycle@test.com",
            })
            self.assertEqual(reg.status_code, 200)
            token = reg.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            # /me
            me = await c.get("/api/auth/me", headers=headers)
            self.assertEqual(me.status_code, 200)
            self.assertEqual(me.json()["username"], "cycle_user")

            # Logout
            logout = await c.post("/api/auth/logout", headers=headers)
            self.assertEqual(logout.status_code, 200)

            # /me should fail now
            me2 = await c.get("/api/auth/me", headers=headers)
            self.assertEqual(me2.status_code, 401)

    # ── Change Password ───────────────────────────────────────────

    async def test_change_password_rejects_wrong_current(self):
        async with AsyncClient(transport=self._transport(), base_url=self.BASE) as c:
            reg = await c.post("/api/auth/register", json={
                "username": "chpw_user",
                "password": "OldPass1234!",
                "email": "chpw@test.com",
            })
            token = reg.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            res = await c.post("/api/auth/change-password", headers=headers, json={
                "current_password": "WrongOldPass",
                "new_password": "NewPass12345!",
                "confirm_password": "NewPass12345!",
            })
        self.assertEqual(res.status_code, 400)

    # ── Forgot / Reset Password ───────────────────────────────────

    async def test_forgot_password_returns_generic_for_unknown_email(self):
        async with AsyncClient(transport=self._transport(), base_url=self.BASE) as c:
            res = await c.post("/api/auth/forgot-password", json={
                "email": "unknown_abc@test.com",
            })
        self.assertEqual(res.status_code, 200)
        self.assertIn("message", res.json())

    async def test_reset_password_rejects_invalid_token(self):
        async with AsyncClient(transport=self._transport(), base_url=self.BASE) as c:
            res = await c.post("/api/auth/reset-password", json={
                "token": "totally-bogus-token",
                "new_password": "NewStrong123!",
            })
        self.assertEqual(res.status_code, 400)

    # ── Analytics Auth ────────────────────────────────────────────

    async def test_analytics_roi_requires_auth(self):
        async with AsyncClient(transport=self._transport(), base_url=self.BASE) as c:
            res = await c.post("/api/analytics/roi", json={
                "config": {},
                "optimization": {},
                "tasks": [],
            })
        self.assertEqual(res.status_code, 401)

    # ── Tenant Task Data Isolation ─────────────────────────────────

    async def test_tenant_task_data_isolation(self):
        async with AsyncClient(transport=self._transport(), base_url=self.BASE) as c:
            # 1. Register User A
            reg_a = await c.post("/api/auth/register", json={
                "username": "user_a",
                "password": "PasswordA123!",
                "email": "user_a@test.com",
                "company_name": "Company A"
            })
            self.assertEqual(reg_a.status_code, 200)
            token_a = reg_a.json()["access_token"]
            headers_a = {"Authorization": f"Bearer {token_a}"}

            # 2. Register User B
            reg_b = await c.post("/api/auth/register", json={
                "username": "user_b",
                "password": "PasswordB123!",
                "email": "user_b@test.com",
                "company_name": "Company B"
            })
            self.assertEqual(reg_b.status_code, 200)
            token_b = reg_b.json()["access_token"]
            headers_b = {"Authorization": f"Bearer {token_b}"}

            # 3. User A creates a task
            create_res = await c.post("/api/tasks", headers=headers_a, json={
                "id": "A_unique_task",
                "name": "Task belonging to User A",
                "time": 15.0,
                "predecessors": [],
                "zoning": "None"
            })
            self.assertEqual(create_res.status_code, 200)

            # 4. User B gets tasks - should NOT contain User A's unique task
            get_b_res = await c.get("/api/tasks", headers=headers_b)
            self.assertEqual(get_b_res.status_code, 200)
            tasks_b = get_b_res.json()
            # Ensure "A_unique_task" is not in User B's tasks list
            task_ids_b = [t["id"] for t in tasks_b]
            self.assertNotIn("A_unique_task", task_ids_b)


if __name__ == "__main__":
    unittest.main()
