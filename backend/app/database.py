"""
OPTO-PROFIT Database Layer
==========================
SQLAlchemy engine, session factory, and FastAPI dependency for
local SQLite persistence.

Usage in endpoints:
    from .database import get_db
    from sqlalchemy.orm import Session

    @app.get("/example")
    def example(db: Session = Depends(get_db)):
        ...
"""

import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

# ── Load .env if python-dotenv is available ───────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from .paths import get_persistent_db_path, is_desktop_mode

# In desktop mode, use a persistent path in the user's AppData folder
# so data survives across PyInstaller temp-dir cleanups.
# In server/dev mode, keep the original behaviour (env var or relative path).
if is_desktop_mode():
    _db_path = get_persistent_db_path()
    DATABASE_URL = f"sqlite:///{_db_path}"
else:
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./optoprofit.db")

# SQLite needs check_same_thread=False when used with FastAPI's
# threaded request handling (each request may land on a different thread).
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def init_db() -> None:
    """Create all tables that don't exist yet and execute SQLite migrations.

    Called once during FastAPI lifespan startup.
    """
    # Import sql_models so all ORM classes register with Base.metadata
    from . import sql_models  # noqa: F401
    Base.metadata.create_all(bind=engine)

    # Dynamic SQLite migrations: add tenant_id if missing and backfill data.
    # We use engine.begin() so SQLAlchemy auto-commits the transaction.
    with engine.begin() as conn:
        for table in ["tasks", "config", "profiles"]:
            try:
                # Retrieve existing columns using PRAGMA
                cursor = conn.execute(text(f"PRAGMA table_info({table})"))
                columns = [row[1] for row in cursor.fetchall()]
                if "tenant_id" not in columns:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN tenant_id VARCHAR(20)"))
                    print(f"Schema Migration: Added tenant_id column to {table} table.")
                
                # Backfill tenant_id values by referencing user_id to user tenant_id
                conn.execute(text(f"""
                    UPDATE {table}
                    SET tenant_id = (SELECT tenant_id FROM users WHERE users.id = {table}.user_id)
                    WHERE tenant_id IS NULL
                """))
            except Exception as e:
                print(f"Migration / Backfill failed for table {table}: {e}")


def get_db():
    """FastAPI dependency — yields a scoped SQLAlchemy session.

    Automatically commits on success and rolls back on exception.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
