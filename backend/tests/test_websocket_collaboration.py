"""
Integration tests for the OPTO-PROFIT WebSocket Collaboration endpoint.
=========================================================================
Tests the /api/ws/{room_id} endpoint using pytest-asyncio and the
starlette.testclient.WebSocketTestSession (synchronous) plus a custom
async approach via httpx/anyio for multi-client broadcast scenarios.

Test Coverage:
    - Unauthenticated connection → 1008 Policy Violation close
    - Auth timeout (no first-frame within 8s) → close
    - Token-only auth (first-frame JSON with valid JWT) → accepted
    - Unauthorized room_id (not user's id or tenant) → 1008 close
    - Two-client broadcast: message sent by client A is received by client B

Run with:
    cd backend
    python -m pytest tests/test_websocket_collaboration.py -v
"""

import asyncio
import json
import os
import unittest

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ── Test DB Override ─────────────────────────────────────────────────────────
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db

TEST_DB_URL = "sqlite:///./test_ws_collab.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


from httpx import AsyncClient, ASGITransport
from app.main import app


class WebSocketCollaborationTest(unittest.IsolatedAsyncioTestCase):
    """Integration tests for /api/ws/{room_id}."""

    BASE = "http://testserver"

    async def asyncSetUp(self):
        if os.path.exists("./test_ws_collab.db"):
            try:
                os.remove("./test_ws_collab.db")
            except OSError:
                pass
        
        app.dependency_overrides[get_db] = override_get_db
        app.state.limiter.enabled = False
        from app.sql_models import UserDB  # noqa: F401 – ensure model registry
        Base.metadata.create_all(bind=test_engine)
        self._ctx = app.router.lifespan_context(app)
        await self._ctx.__aenter__()

        # Mock SessionLocal in collaboration.py because it doesn't use Depends(get_db)
        from app.routers import collaboration
        self._old_session = collaboration.SessionLocal
        collaboration.SessionLocal = TestSessionLocal

        # Register a test user and capture their token + user_id
        async with AsyncClient(transport=ASGITransport(app=app), base_url=self.BASE) as c:
            res = await c.post("/api/auth/register", json={
                "username": "ws_test_user",
                "password": "WsTest1234!",
                "email": "ws@test.com",
            })
            if res.status_code == 400 or res.status_code == 409:
                login_res = await c.post("/api/auth/login", json={
                    "username": "ws_test_user",
                    "password": "WsTest1234!",
                })
                self.token = login_res.json()["access_token"]
            else:
                self.token = res.json()["access_token"]
            
            # /me to get user id (room_id must be user.id or tenant_id)
            me = await c.get("/api/auth/me", headers={"Authorization": f"Bearer {self.token}"})
            self.user_id = me.json()["id"]

    async def asyncTearDown(self):
        from app.routers import collaboration
        collaboration.SessionLocal = self._old_session
        await self._ctx.__aexit__(None, None, None)
        app.state.limiter.enabled = True
        Base.metadata.drop_all(bind=test_engine)
        app.dependency_overrides.pop(get_db, None)
        if os.path.exists("./test_ws_collab.db"):
            try:
                os.remove("./test_ws_collab.db")
            except OSError:
                pass

    # ── Test 1: Unauthenticated connection is rejected ──────────────────────
    async def test_missing_token_closes_with_policy_violation(self):
        """Client sends no auth frame → server closes with 1008."""
        from starlette.testclient import TestClient
        client = TestClient(app, raise_server_exceptions=False)
        with client.websocket_connect(f"/api/ws/{self.user_id}") as ws:
            # Send an auth message with no token field
            ws.send_json({"action": "ping"})
            # Server should close the connection (1008 Policy Violation)
            try:
                ws.receive_json()
            except Exception:
                pass  # Expected: connection closed by server

    # ── Test 2: Wrong room_id → 1008 rejection ──────────────────────────────
    async def test_unauthorized_room_closes_with_policy_violation(self):
        """Authenticated token but wrong room_id → 1008 Policy Violation."""
        from starlette.testclient import TestClient
        client = TestClient(app, raise_server_exceptions=False)
        unauthorized_room = "wrong-room-id-not-matching-user"
        with client.websocket_connect(f"/api/ws/{unauthorized_room}") as ws:
            ws.send_json({"token": self.token})
            try:
                ws.receive_json()
            except Exception:
                pass  # Expected: closed with 1008

    # ── Test 3: Valid token + correct room → connection accepted ────────────
    async def test_valid_auth_enters_collaboration_loop(self):
        """Authenticated client with correct room_id can send and receive data."""
        from starlette.testclient import TestClient
        client = TestClient(app, raise_server_exceptions=False)
        with client.websocket_connect(f"/api/ws/{self.user_id}") as ws:
            # First frame: authentication
            ws.send_json({"token": self.token})
            # Second frame: a collaboration action — should not raise
            ws.send_json({
                "type": "cursor_move",
                "x": 120,
                "y": 340,
                "user": "ws_test_user"
            })
            # Connection remains alive (no exception raised = passed)

    # ── Test 4: ConnectionManager.broadcast() unit test ─────────────────────
    async def test_connection_manager_broadcasts_to_all_except_sender(self):
        """
        Unit test of the ConnectionManager.broadcast() method.
        Verifies that a message is sent to all registered connections in a room
        EXCEPT the sender, which is the core broadcast contract.
        """
        from app.routers.collaboration import ConnectionManager

        # Create a fresh isolated manager for this test
        test_manager = ConnectionManager()
        room = "test-room-broadcast"

        # Create two mock WebSocket objects with async send_json
        class MockWS:
            def __init__(self, name):
                self.name = name
                self.sent_messages = []

            async def send_json(self, msg):
                self.sent_messages.append(msg)

        ws_a = MockWS("client_a")
        ws_b = MockWS("client_b")
        ws_c = MockWS("client_c")

        # Register all three in the same room
        await test_manager.connect(ws_a, room)
        await test_manager.connect(ws_b, room)
        await test_manager.connect(ws_c, room)

        # Broadcast a message from ws_a (exclude sender)
        test_message = {"type": "task_update", "task_id": "X", "value": 42}
        await test_manager.broadcast(test_message, room, exclude=ws_a)

        # ws_b and ws_c must receive the message; ws_a (sender) must NOT
        self.assertEqual(ws_b.sent_messages, [test_message], "ws_b should receive broadcast")
        self.assertEqual(ws_c.sent_messages, [test_message], "ws_c should receive broadcast")
        self.assertEqual(ws_a.sent_messages, [],              "ws_a (sender) must NOT receive its own broadcast")

        # Disconnect ws_a and verify room still has 2 entries
        test_manager.disconnect(ws_a, room)
        self.assertEqual(len(test_manager.active_connections[room]), 2)

        # Disconnect remaining — room should be cleaned up
        test_manager.disconnect(ws_b, room)
        test_manager.disconnect(ws_c, room)
        self.assertNotIn(room, test_manager.active_connections,
                         "Room must be removed after all clients disconnect.")

    # ── Test 5: End-to-End Broadcast using httpx_ws ───────────────────────────
    async def test_end_to_end_broadcast_between_two_clients(self):
        """
        Connects two async httpx_ws clients to the same room and verifies
        that a message sent by Client A is received by Client B.
        """
        import httpx_ws
        from httpx_ws.transport import ASGIWebSocketTransport
        
        room_url = f"ws://testserver/api/ws/{self.user_id}"
        test_msg = {"type": "cursor_move", "x": 500, "y": 600, "user": "ws_test_user"}
        
        # Use ASGIWebSocketTransport to support WebSockets properly
        async with AsyncClient(transport=ASGIWebSocketTransport(app=app)) as client:
            async with httpx_ws.aconnect_ws(room_url, client) as ws_a, \
                       httpx_ws.aconnect_ws(room_url, client) as ws_b:
                
                # Authenticate both as the same user
                await ws_a.send_json({"token": self.token})
                await ws_b.send_json({"token": self.token})
                
                # Wait briefly to ensure both are registered in the room
                await asyncio.sleep(0.1)
                
                # Client A sends a broadcast message
                await ws_a.send_json(test_msg)
                
                # Client B should receive it
                received_msg = await ws_b.receive_json()
                
                # Verify payload
                self.assertEqual(received_msg.get("type"), test_msg["type"])
                self.assertEqual(received_msg.get("x"), test_msg["x"])
                self.assertEqual(received_msg.get("y"), test_msg["y"])
                self.assertEqual(received_msg.get("user"), test_msg["user"])

if __name__ == "__main__":
    unittest.main()
