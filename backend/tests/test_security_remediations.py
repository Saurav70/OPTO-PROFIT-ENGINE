"""
Security Integration Tests for OPTO-PROFIT.
=========================================
Tests the security remediation tasks implemented:
1. Password strength verification (MED-1)
2. HttpOnly Cookie session authentication (HIGH-1)
3. Brute force login prevention and account lockout (MED-5)
"""

import os
import unittest
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.sql_models import UserDB
from fastapi.testclient import TestClient

TEST_DATABASE_URL = "sqlite:///./test_security.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


class SecurityRemediationsTest(unittest.TestCase):
    def setUp(self):
        # Override the database dependency in FastAPI
        app.dependency_overrides[get_db] = override_get_db
        # Disable slowapi rate limiting during security checks to prevent slowapi lockout
        app.state.limiter.enabled = False

        # Create all tables in the test database
        Base.metadata.create_all(bind=test_engine)
        self.client = TestClient(app)

    def tearDown(self):
        # Drop all tables to clean up and avoid state pollution
        Base.metadata.drop_all(bind=test_engine)
        # Remove the override
        app.dependency_overrides.pop(get_db, None)
        # Re-enable rate limiting
        app.state.limiter.enabled = True

        # Delete the test DB file if it exists
        if os.path.exists("./test_security.db"):
            try:
                os.remove("./test_security.db")
            except OSError:
                pass

    def test_password_complexity_rules(self):
        """Verify that weak passwords are rejected with 422, and strong passwords succeed."""
        # 1. Too short (length < 8)
        res = self.client.post("/api/auth/register", json={
            "username": "complex_user",
            "password": "sh1!",
            "email": "complex@test.com"
        })
        self.assertEqual(res.status_code, 422)

        # 2. No uppercase letter
        res = self.client.post("/api/auth/register", json={
            "username": "complex_user",
            "password": "weakpass123!",
            "email": "complex@test.com"
        })
        self.assertEqual(res.status_code, 422)

        # 3. No digit
        res = self.client.post("/api/auth/register", json={
            "username": "complex_user",
            "password": "Weakpass!!!!",
            "email": "complex@test.com"
        })
        self.assertEqual(res.status_code, 422)

        # 4. No special character
        res = self.client.post("/api/auth/register", json={
            "username": "complex_user",
            "password": "Weakpass1234",
            "email": "complex@test.com"
        })
        self.assertEqual(res.status_code, 422)

        # 5. Successful register with fully compliant password
        res = self.client.post("/api/auth/register", json={
            "username": "complex_user",
            "password": "StrongPass123!",
            "email": "complex@test.com"
        })
        self.assertEqual(res.status_code, 200)

    def test_httponly_session_cookies(self):
        """Verify that authentication endpoints use HttpOnly cookies for session storage."""
        # Register user
        res = self.client.post("/api/auth/register", json={
            "username": "cookie_user",
            "password": "StrongPass123!",
            "email": "cookie@test.com"
        })
        self.assertEqual(res.status_code, 200)

        # Check Set-Cookie headers in the registration response
        set_cookie_header = res.headers.get("set-cookie", "")
        self.assertIn("opto_session", set_cookie_header)
        self.assertIn("HttpOnly", set_cookie_header)
        self.assertIn("samesite=lax", set_cookie_header.lower())

        # Clear client cookies and perform a fresh login
        self.client.cookies.clear()
        res = self.client.post("/api/auth/login", json={
            "username": "cookie_user",
            "password": "StrongPass123!"
        })
        self.assertEqual(res.status_code, 200)
        set_cookie_header = res.headers.get("set-cookie", "")
        self.assertIn("opto_session", set_cookie_header)
        self.assertIn("HttpOnly", set_cookie_header)

        # Logout and check that cookie is cleared
        res = self.client.post("/api/auth/logout")
        self.assertEqual(res.status_code, 200)
        set_cookie_header = res.headers.get("set-cookie", "")
        self.assertIn("opto_session=", set_cookie_header)
        self.assertIn("Max-Age=0", set_cookie_header)

    def test_account_lockout(self):
        """Verify that 5 failed login attempts triggers lockout, rejecting further tries."""
        # Register user
        res = self.client.post("/api/auth/register", json={
            "username": "lockout_user",
            "password": "StrongPass123!",
            "email": "lockout@test.com"
        })
        self.assertEqual(res.status_code, 200)

        # Clear cookies so we don't accidentally send valid session headers
        self.client.cookies.clear()

        # Run 5 failed attempts
        for _ in range(5):
            res = self.client.post("/api/auth/login", json={
                "username": "lockout_user",
                "password": "WrongPassword123!"
            })
            self.assertEqual(res.status_code, 401)

        # The 6th attempt should trigger 403 Forbidden Lockout
        res = self.client.post("/api/auth/login", json={
            "username": "lockout_user",
            "password": "WrongPassword123!"
        })
        self.assertEqual(res.status_code, 403)
        self.assertIn("locked due to multiple failed login attempts", res.json()["detail"])

        # Attempting login with the CORRECT password should also be rejected
        res = self.client.post("/api/auth/login", json={
            "username": "lockout_user",
            "password": "StrongPass123!"
        })
        self.assertIn("locked due to multiple failed login attempts", res.json()["detail"])


if __name__ == "__main__":
    unittest.main()
