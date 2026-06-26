import asyncio
import logging
from typing import Dict, List
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from ..database import SessionLocal
from ..auth import decode_access_token, hash_token, SESSION_COOKIE_NAME
from ..sql_models import SessionDB, UserDB

logger = logging.getLogger("optoprofit.collaboration")
router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # Maps room_id -> List[WebSocket]
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str):
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)
        logger.info(f"WebSocket connected to room: {room_id}. Connections: {len(self.active_connections[room_id])}")

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            if websocket in self.active_connections[room_id]:
                self.active_connections[room_id].remove(websocket)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]
        logger.info(f"WebSocket disconnected from room: {room_id}")

    async def broadcast(self, message: dict, room_id: str, exclude: WebSocket | None = None):
        if room_id not in self.active_connections:
            return
        
        for connection in self.active_connections[room_id]:
            if connection == exclude:
                continue
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"WebSocket broadcast error to peer: {e}")

manager = ConnectionManager()

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from ..database import SessionLocal

@router.websocket("/api/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    """
    WebSocket endpoint with secure first-message authentication (HIGH-3).

    The client MUST send a JSON auth message as the very first frame:
        {"token": "<jwt>"}

    The token is read from the first WebSocket message instead of the URL
    query-string, preventing it from being written to server access logs,
    browser history, and CDN/proxy logs.

    As an alternative for browser clients, the opto_session HttpOnly cookie
    is also accepted if no token field is present in the auth message.
    """
    # Accept the connection so we can send a proper close frame on auth failure
    await websocket.accept()

    # ── Step 1: Receive the auth message with a strict timeout ──────
    try:
        auth_msg = await asyncio.wait_for(websocket.receive_json(), timeout=8.0)
    except asyncio.TimeoutError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Auth timeout — send token within 8 seconds")
        return
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid auth message format")
        return

    # ── Step 2: Extract token (message field or cookie) ─────────────
    token: str | None = auth_msg.get("token") if isinstance(auth_msg, dict) else None
    if not token:
        # Fallback: HttpOnly cookie (set by browser automatically on same-origin requests)
        token = websocket.cookies.get(SESSION_COOKIE_NAME)

    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication token missing")
        return

    # ── Step 3: Validate token, session, and room scope ─────────────
    db = SessionLocal()
    try:
        payload = decode_access_token(token)
        if not payload:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid or expired token")
            return

        is_2fa_temp = payload.get("is_2fa_temp", False)
        if is_2fa_temp:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="2FA verification required")
            return

        token_hash_val = hash_token(token)
        session = db.query(SessionDB).filter(SessionDB.token_hash == token_hash_val).first()
        if not session:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Session not found or expired")
            return

        user = db.query(UserDB).filter(UserDB.id == session.user_id).first()
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="User not found")
            return

        # Restrict room access to the user's own tenant_id or user_id
        if room_id != user.tenant_id and room_id != user.id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Unauthorized room access")
            return

    except Exception as e:
        logger.error(f"WebSocket auth exception: {e}")
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR, reason="Authentication server error")
        return

    # ── Step 4: Authenticated — enter the collaboration loop ─────────
    await manager.connect(websocket, room_id)
    try:
        while True:
            data = await websocket.receive_json()
            # Broadcast collaborative actions: cursor_move, layout_shift, task_update
            await manager.broadcast(data, room_id, exclude=websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
    except Exception as e:
        logger.error(f"WebSocket loop termination: {e}")
        manager.disconnect(websocket, room_id)

