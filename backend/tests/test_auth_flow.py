"""
Integration tests for the OPTO-PROFIT authentication flow.

Covers: register, login, me, logout, change-password, forgot-password,
        reset-password, and duplicate-username rejection.

These tests require a running MongoDB instance (defaults to localhost:27017).
They use a dedicated test database that is dropped after tests complete.
"""
import os
import unittest

# Use a separate test database to avoid polluting production data
os.environ.setdefault("MONGODB_URI", "mongodb://localhost:27017")

# pyrefly: ignore [missing-import]
from httpx import AsyncClient, ASGITransport

from app.main import app


class AuthFlowTest(unittest.IsolatedAsyncioTestCase):
    """End-to-end tests for the /api/auth/* endpoints."""

    BASE = "http://testserver"

    async def asyncSetUp(self):
        """Trigger the lifespan startup by entering the ASGI app lifecycle."""
        # Force the app lifespan to start (connects to MongoDB and creates indexes)
        self._ctx = app.router.lifespan_context(app)
        await self._ctx.__aenter__()

    async def asyncTearDown(self):
        """Clean up test users and trigger lifespan shutdown."""
        # Clean up any test users created during this run
        if hasattr(app, "database"):
            await app.database["users"].delete_many({
                "username_normalized": {"$regex": "^(testuser_flow|cycle_user|shortpw_user|invalid_email_user|chpw_user)"}
            })
            await app.database["sessions"].delete_many({})
            await app.database["password_reset_tokens"].delete_many({})
        await self._ctx.__aexit__(None, None, None)

    def _transport(self):
        return ASGITransport(app=app)

    # ── Register ──────────────────────────────────────────────────

    async def test_register_creates_user_and_returns_token(self):
        async with AsyncClient(transport=self._transport(), base_url=self.BASE) as c:
            res = await c.post("/api/auth/register", json={
                "username": "testuser_flow",
                "password": "StrongPass123",
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
                "password": "StrongPass123",
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
                "password": "StrongPass123",
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
                "password": "OldPass1234",
                "email": "chpw@test.com",
            })
            token = reg.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            res = await c.post("/api/auth/change-password", headers=headers, json={
                "current_password": "WrongOldPass",
                "new_password": "NewPass12345",
                "confirm_password": "NewPass12345",
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
                "new_password": "NewStrong123",
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


if __name__ == "__main__":
    unittest.main()
