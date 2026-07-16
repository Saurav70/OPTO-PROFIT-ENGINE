import hashlib
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import create_engine, text
import app.main as main_app
from app.database import DATABASE_URL
from app.sql_models import (
    get_old_fernet, get_fernet, UserDB, TaskDB, ConfigDB, ProfileDB, SessionDB, PasswordResetTokenDB
)
import logging

logger = logging.getLogger("optoprofit-migration")
router = APIRouter(prefix="/api/migration", tags=["migration"])

class MigrationUnlockRequest(BaseModel):
    recovery_phrase: str

def _derive_sqlcipher_key(hwid: str) -> str:
    return hashlib.sha256(f"SQLCIPHER_{hwid}_SALT_9281".encode("utf-8")).hexdigest()

@router.post("/unlock")
def unlock_database(payload: MigrationUnlockRequest):
    if not main_app.MIGRATION_REQUIRED:
        raise HTTPException(status_code=400, detail="Migration is not currently required.")

    old_hwid = payload.recovery_phrase.strip().replace("-", "")
    
    if len(old_hwid) != 16:
        raise HTTPException(status_code=400, detail="Invalid Recovery Phrase format.")

    old_sqlcipher_key = _derive_sqlcipher_key(old_hwid)
    
    try:
        old_fernet = get_old_fernet(old_hwid)
        new_fernet = get_fernet()
    except Exception as e:
        logger.error(f"Failed to load Fernet keys: {e}")
        raise HTTPException(status_code=500, detail="Failed to initialize encryption keys.")

    # Try connecting to the database using the OLD SQLCipher key
    try:
        temp_engine = create_engine(
            DATABASE_URL,
            connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
            echo=False
        )
        
        with temp_engine.begin() as conn:
            # Unlock the DB with the OLD key
            conn.execute(text(f"PRAGMA key = '{old_sqlcipher_key}'"))
            # A simple query to verify decryption works
            conn.execute(text("SELECT COUNT(*) FROM users")).fetchone()
            
            # Rekey the SQLite database with the NEW SQLCipher key
            from app.license import get_hardware_fingerprint
            new_hwid = get_hardware_fingerprint()
            new_sqlcipher_key = _derive_sqlcipher_key(new_hwid)
            
            logger.info("Re-keying SQLCipher database...")
            conn.execute(text(f"PRAGMA rekey = '{new_sqlcipher_key}'"))
            
    except Exception as e:
        logger.error(f"Migration DB connection failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid Recovery Phrase.")

    # Now that the file is rekeyed, connect with the new key (handled by standard database.py or temp engine)
    logger.info("Migrating Fernet encrypted columns...")
    
    try:
        temp_engine2 = create_engine(
            DATABASE_URL,
            connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
            echo=False
        )
        with temp_engine2.begin() as conn:
            conn.execute(text(f"PRAGMA key = '{new_sqlcipher_key}'"))
            
            # 1. Migrate Users
            users = conn.execute(text("SELECT id, email, full_name, phone_number FROM users")).fetchall()
            for row in users:
                user_id, email, full_name, phone_number = row
                new_email = None
                new_fn = None
                new_pn = None
                
                if email:
                    try:
                        decrypted = old_fernet.decrypt(email.encode('utf-8')).decode('utf-8')
                        new_email = new_fernet.encrypt(decrypted.encode('utf-8')).decode('utf-8')
                    except Exception: pass
                if full_name:
                    try:
                        decrypted = old_fernet.decrypt(full_name.encode('utf-8')).decode('utf-8')
                        new_fn = new_fernet.encrypt(decrypted.encode('utf-8')).decode('utf-8')
                    except Exception: pass
                if phone_number:
                    try:
                        decrypted = old_fernet.decrypt(phone_number.encode('utf-8')).decode('utf-8')
                        new_pn = new_fernet.encrypt(decrypted.encode('utf-8')).decode('utf-8')
                    except Exception: pass
                
                conn.execute(text("UPDATE users SET email = :em, full_name = :fn, phone_number = :pn WHERE id = :id"), 
                             {"em": new_email, "fn": new_fn, "pn": new_pn, "id": user_id})

            # 2. Migrate Tasks
            tasks = conn.execute(text("SELECT pk, name, predecessors_json, custom_attributes_json FROM tasks")).fetchall()
            for row in tasks:
                pk, name, pred, attrs = row
                new_name, new_pred, new_attrs = None, None, None
                
                if name:
                    try:
                        decrypted = old_fernet.decrypt(name.encode('utf-8')).decode('utf-8')
                        new_name = new_fernet.encrypt(decrypted.encode('utf-8')).decode('utf-8')
                    except Exception: pass
                if pred:
                    try:
                        decrypted = old_fernet.decrypt(pred.encode('utf-8')).decode('utf-8')
                        new_pred = new_fernet.encrypt(decrypted.encode('utf-8')).decode('utf-8')
                    except Exception: pass
                if attrs:
                    try:
                        decrypted = old_fernet.decrypt(attrs.encode('utf-8')).decode('utf-8')
                        new_attrs = new_fernet.encrypt(decrypted.encode('utf-8')).decode('utf-8')
                    except Exception: pass
                
                conn.execute(text("UPDATE tasks SET name = :nm, predecessors_json = :pr, custom_attributes_json = :attr WHERE pk = :pk"),
                             {"nm": new_name or name, "pr": new_pred or pred, "attr": new_attrs or attrs, "pk": pk})

            # 3. Migrate Config
            configs = conn.execute(text("SELECT id, data_json, layout_presets_json FROM config")).fetchall()
            for row in configs:
                pk, data_json, layout_json = row
                new_data, new_layout = None, None
                
                if data_json:
                    try:
                        decrypted = old_fernet.decrypt(data_json.encode('utf-8')).decode('utf-8')
                        new_data = new_fernet.encrypt(decrypted.encode('utf-8')).decode('utf-8')
                    except Exception: pass
                if layout_json:
                    try:
                        decrypted = old_fernet.decrypt(layout_json.encode('utf-8')).decode('utf-8')
                        new_layout = new_fernet.encrypt(decrypted.encode('utf-8')).decode('utf-8')
                    except Exception: pass
                
                conn.execute(text("UPDATE config SET data_json = :dj, layout_presets_json = :lj WHERE id = :pk"),
                             {"dj": new_data or data_json, "lj": new_layout or layout_json, "pk": pk})

            # 4. Migrate Profiles
            profiles = conn.execute(text("SELECT id, name, data_json FROM profiles")).fetchall()
            for row in profiles:
                pk, name, data_json = row
                new_name, new_data = None, None
                
                if name:
                    try:
                        decrypted = old_fernet.decrypt(name.encode('utf-8')).decode('utf-8')
                        new_name = new_fernet.encrypt(decrypted.encode('utf-8')).decode('utf-8')
                    except Exception: pass
                if data_json:
                    try:
                        decrypted = old_fernet.decrypt(data_json.encode('utf-8')).decode('utf-8')
                        new_data = new_fernet.encrypt(decrypted.encode('utf-8')).decode('utf-8')
                    except Exception: pass
                
                conn.execute(text("UPDATE profiles SET name = :nm, data_json = :dj WHERE id = :pk"),
                             {"nm": new_name or name, "dj": new_data or data_json, "pk": pk})
                             
    except Exception as e:
        logger.error(f"Migration column decryption failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to migrate encrypted columns.")

    # Unlock the application!
    main_app.MIGRATION_REQUIRED = False
    logger.info("Migration successful! Application unlocked.")
    return {"success": True, "message": "Database migrated successfully!"}
