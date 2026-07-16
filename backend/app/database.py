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


def _get_encryption_key() -> str:
    """Generate a stable, secure 64-character hex key bound to this host machine's hardware ID."""
    from .license import get_hardware_fingerprint
    import hashlib
    hwid = get_hardware_fingerprint()
    return hashlib.sha256(f"SQLCIPHER_{hwid}_SALT_9281".encode("utf-8")).hexdigest()


# ── SQLCipher Engine Factory ──────────────────────────────────────
# In a production PyInstaller build, sqlcipher3 is bundled. In dev mode,
# we fall back to standard SQLite (Fernet column-level encryption still active).
def _create_engine():
    """Create a SQLAlchemy engine, using SQLCipher in production builds."""
    _SQLCIPHER_AVAILABLE = False
    try:
        import sqlcipher3  # noqa: F401
        _SQLCIPHER_AVAILABLE = True
    except ImportError:
        pass

    if _SQLCIPHER_AVAILABLE and DATABASE_URL.startswith("sqlite"):
        from sqlalchemy.dialects import registry
        registry.load("sqlite")
        from sqlcipher3 import dbapi2 as sqlcipher
        _engine = create_engine(
            DATABASE_URL.replace("sqlite://", "sqlite+sqlcipher://", 1),
            connect_args={
                "check_same_thread": False,
                "creator": lambda: sqlcipher.connect(DATABASE_URL.replace("sqlite:///", ""))
            },
            echo=False,
        )
        import logging
        logging.getLogger("optoprofit").info("SQLCipher encryption: ACTIVE")
    else:
        if not _SQLCIPHER_AVAILABLE:
            import logging
            logging.getLogger("optoprofit").warning(
                "sqlcipher3 not installed — database stored in plaintext SQLite. "
                "Install sqlcipher3-binary for encrypted storage in production."
            )
        _engine = create_engine(
            DATABASE_URL,
            connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
            echo=False,
        )
    return _engine


engine = _create_engine()


from sqlalchemy import event

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if DATABASE_URL.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        # PRAGMA key: sets the SQLCipher encryption key.
        # This is effective only when connected via the sqlcipher3 driver.
        # With standard sqlite3, this is a no-op (unknown PRAGMA is silently ignored).
        key = _get_encryption_key()
        cursor.execute(f"PRAGMA key = '{key}'")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA cache_size=-64000")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def init_db() -> bool:
    """Create all tables that don't exist yet and execute SQLite migrations.

    Called once during FastAPI lifespan startup.
    Returns True if successful, False if the database is locked (wrong hardware ID).
    """
    # Import sql_models so all ORM classes register with Base.metadata
    from . import sql_models  # noqa: F401
    import sqlalchemy.exc
    try:
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
        return True
    except (sqlalchemy.exc.DatabaseError, sqlalchemy.exc.OperationalError) as e:
        if "file is not a database" in str(e).lower() or "encrypted" in str(e).lower():
            print("Database encryption key mismatch. Migration required.")
            return False
        raise e


def get_db():
    """FastAPI dependency — yields a scoped SQLAlchemy session.

    Automatically commits on success and rolls back on exception.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
