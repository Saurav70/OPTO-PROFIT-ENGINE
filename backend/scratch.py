import asyncio
import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from httpx import AsyncClient, ASGITransport
import httpx_ws

TEST_DB_URL = "sqlite:///./test_scratch.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()

async def run_test():
    app.dependency_overrides[get_db] = override_get_db
    app.state.limiter.enabled = False
    Base.metadata.create_all(bind=test_engine)
    
    ctx = app.router.lifespan_context(app)
    await ctx.__aenter__()

    try:
        BASE = "http://testserver"
        async with AsyncClient(transport=ASGITransport(app=app), base_url=BASE) as c:
            res = await c.post("/api/auth/register", json={
                "username": "ws_scratch",
                "password": "WsTest1234!",
                "email": "scratch@test.com",
            })
            token = res.json()["access_token"]
            me = await c.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
            user_id = me.json()["id"]

        room_url = f"{BASE}/api/ws/{user_id}"
        
        async with AsyncClient(transport=ASGITransport(app=app)) as client:
            async with httpx_ws.aconnect_ws(room_url, client) as ws_a, \
                       httpx_ws.aconnect_ws(room_url, client) as ws_b:
                
                await ws_a.send_json({"token": token})
                await ws_b.send_json({"token": token})
                
                await asyncio.sleep(0.1)
                
                msg = {"type": "cursor_move", "x": 1, "y": 2, "user": "ws_scratch"}
                await ws_a.send_json(msg)
                
                recv = await ws_b.receive_json()
                print("Received:", recv)
    finally:
        await ctx.__aexit__(None, None, None)

if __name__ == "__main__":
    asyncio.run(run_test())
