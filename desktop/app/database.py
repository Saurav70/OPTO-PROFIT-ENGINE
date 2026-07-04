"""
OPTO-PROFIT Desktop — Local SQLite Database Layer
==================================================
A drop-in async replacement for Motor (MongoDB async driver).

Implements the same interface as motor.AsyncIOMotorCollection:
  - find_one(filter)
  - insert_one(doc)
  - insert_many(docs)
  - update_one(filter, update, upsert=False)
  - replace_one(filter, replacement, upsert=False)
  - delete_one(filter)
  - delete_many(filter)
  - find(filter).to_list(length)
  - create_index(field, **kwargs)

All data is stored in a single SQLite file at:
  %APPDATA%\\OPTO-PROFIT\\data.db

Each MongoDB "collection" maps to a SQLite table with columns:
  doc_id TEXT PRIMARY KEY
  data   TEXT  (JSON blob)

Datetime objects are serialised as {"__dt__": "<isoformat>"} within the JSON
blob and transparently restored on read.
"""

import aiosqlite
from contextlib import asynccontextmanager

@asynccontextmanager
async def connect_db(db_path: str):
    """Establish an async connection to the SQLite database and send the hardware-locked SQLCipher key."""
    from .license import get_hardware_fingerprint
    import hashlib
    import os
    import uuid
    from pathlib import Path

    app_data = Path(os.environ.get("APPDATA", Path.home())) / "OPTO-PROFIT"
    salt_path = app_data / "installation_salt.key"
    if not salt_path.exists():
        app_data.mkdir(parents=True, exist_ok=True)
        salt_path.write_bytes(uuid.uuid4().bytes)
    dynamic_salt = salt_path.read_bytes()

    try:
        hwid = get_hardware_fingerprint().encode("utf-8")
    except Exception:
        hwid = b"DEFAULT_HWID"
    
    key_material = b"SQLCIPHER_" + hwid + b"_" + dynamic_salt
    key = hashlib.sha256(key_material).hexdigest()
    
    async with aiosqlite.connect(db_path) as db:
        await db.execute(f"PRAGMA key = '{key}'")
        yield db
import json
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


# ── Database file location ────────────────────────────────────────────────────
APP_DATA = Path(os.environ.get("APPDATA", Path.home())) / "OPTO-PROFIT"
APP_DATA.mkdir(parents=True, exist_ok=True)
DB_PATH = APP_DATA / "data.db"


# ── JSON serialisation helpers ────────────────────────────────────────────────

def _to_json(obj: Any) -> str:
    """Recursively serialise Python objects (including datetime) to a JSON string."""
    def _enc(o):
        if isinstance(o, datetime):
            return {"__dt__": o.isoformat()}
        if isinstance(o, dict):
            return {k: _enc(v) for k, v in o.items()}
        if isinstance(o, list):
            return [_enc(i) for i in o]
        return o
    return json.dumps(_enc(obj), ensure_ascii=False)


def _from_json(s: str) -> dict:
    """Recursively deserialise JSON string, restoring datetime objects."""
    def _dec(o):
        if isinstance(o, dict):
            if "__dt__" in o:
                return datetime.fromisoformat(o["__dt__"])
            return {k: _dec(v) for k, v in o.items()}
        if isinstance(o, list):
            return [_dec(i) for i in o]
        return o
    return _dec(json.loads(s))


# ── MongoDB-style filter matching ─────────────────────────────────────────────

def _matches(doc: dict, filter_dict: dict) -> bool:
    """Return True if *doc* satisfies all conditions in *filter_dict*."""
    for key, condition in filter_dict.items():
        # MongoDB stores real _id as the primary key; we inject it as "_id" on read
        val = doc.get(key)

        if isinstance(condition, dict):
            for op, operand in condition.items():
                if op == "$exists":
                    present = key in doc
                    if bool(operand) != present:
                        return False
                elif op == "$regex":
                    flags = 0
                    options = condition.get("$options", "")
                    if "i" in options:
                        flags |= re.IGNORECASE
                    if not re.search(operand, str(val or ""), flags):
                        return False
                elif op == "$in":
                    if val not in operand:
                        return False
                elif op == "$nin":
                    if val in operand:
                        return False
                elif op == "$gt":
                    if not (val is not None and val > operand):
                        return False
                elif op == "$gte":
                    if not (val is not None and val >= operand):
                        return False
                elif op == "$lt":
                    if not (val is not None and val < operand):
                        return False
                elif op == "$lte":
                    if not (val is not None and val <= operand):
                        return False
                elif op == "$ne":
                    if val == operand:
                        return False
                # Silently ignore $options when used alongside $regex
        else:
            if val != condition:
                return False
    return True


def _apply_set(doc: dict, update_dict: dict) -> dict:
    """Apply a MongoDB update operator dict to *doc* and return the modified copy."""
    doc = dict(doc)
    if "$set" in update_dict:
        doc.update(update_dict["$set"])
    if "$unset" in update_dict:
        for field in update_dict["$unset"]:
            doc.pop(field, None)
    return doc


# ── Collection ────────────────────────────────────────────────────────────────

class SQLiteCollection:
    """Mimics a motor.AsyncIOMotorCollection against a SQLite table."""

    def __init__(self, db_path: Path, name: str) -> None:
        self._db_path = str(db_path)
        self._name = name

    # ── Internal helpers ──────────────────────────────────────────────────────

    async def _ensure(self) -> None:
        """Create the backing table if it does not exist."""
        async with connect_db(self._db_path) as db:
            await db.execute(
                f'CREATE TABLE IF NOT EXISTS "{self._name}" '
                '(doc_id TEXT PRIMARY KEY, data TEXT NOT NULL)'
            )
            await db.commit()

    def _row_to_doc(self, row) -> dict:
        doc = _from_json(row[1])
        doc["_id"] = row[0]
        return doc

    # ── Public API ────────────────────────────────────────────────────────────

    async def create_index(self, field: str, **kwargs) -> None:
        """No-op — ensures table exists; SQLite handles uniqueness at app level."""
        await self._ensure()
        # For sessions with expireAfterSeconds, clean up expired docs on every index call
        if kwargs.get("expireAfterSeconds") is not None and field == "expires_at":
            await self._purge_expired()

    async def _purge_expired(self) -> None:
        """Remove documents whose expires_at has passed (TTL emulation)."""
        now_iso = datetime.now(timezone.utc).isoformat()
        ids_to_delete = []
        async with connect_db(self._db_path) as db:
            async with db.execute(f'SELECT doc_id, data FROM "{self._name}"') as cur:
                async for row in cur:
                    doc = _from_json(row[1])
                    exp = doc.get("expires_at")
                    if exp is not None:
                        if isinstance(exp, dict) and "__dt__" in exp:
                            exp = datetime.fromisoformat(exp["__dt__"])
                        if hasattr(exp, "isoformat"):
                            if exp.tzinfo is None:
                                exp = exp.replace(tzinfo=timezone.utc)
                            if exp < datetime.now(timezone.utc):
                                ids_to_delete.append(row[0])
            for doc_id in ids_to_delete:
                await db.execute(f'DELETE FROM "{self._name}" WHERE doc_id = ?', (doc_id,))
            await db.commit()

    async def find_one(self, filter_dict: dict) -> dict | None:
        await self._ensure()
        async with connect_db(self._db_path) as db:
            async with db.execute(f'SELECT doc_id, data FROM "{self._name}"') as cur:
                async for row in cur:
                    doc = self._row_to_doc(row)
                    if _matches(doc, filter_dict):
                        return doc
        return None

    async def insert_one(self, doc: dict):
        await self._ensure()
        doc = dict(doc)
        doc_id = str(doc.pop("_id", None) or uuid.uuid4())
        async with connect_db(self._db_path) as db:
            await db.execute(
                f'INSERT INTO "{self._name}" (doc_id, data) VALUES (?, ?)',
                (doc_id, _to_json(doc)),
            )
            await db.commit()

        class _Result:
            inserted_id = doc_id
        return _Result()

    async def insert_many(self, docs: list):
        await self._ensure()
        async with connect_db(self._db_path) as db:
            for doc in docs:
                doc = dict(doc)
                doc_id = str(doc.pop("_id", None) or uuid.uuid4())
                await db.execute(
                    f'INSERT INTO "{self._name}" (doc_id, data) VALUES (?, ?)',
                    (doc_id, _to_json(doc)),
                )
            await db.commit()

    async def update_one(self, filter_dict: dict, update_dict: dict, upsert: bool = False):
        await self._ensure()
        async with connect_db(self._db_path) as db:
            matched_id = None
            matched_doc = None
            async with db.execute(f'SELECT doc_id, data FROM "{self._name}"') as cur:
                async for row in cur:
                    doc = self._row_to_doc(row)
                    if _matches(doc, filter_dict):
                        matched_id = row[0]
                        matched_doc = doc
                        break

            if matched_id:
                updated = _apply_set(matched_doc, update_dict)
                updated.pop("_id", None)
                await db.execute(
                    f'UPDATE "{self._name}" SET data = ? WHERE doc_id = ?',
                    (_to_json(updated), matched_id),
                )
            elif upsert:
                new_doc = {}
                if "$set" in update_dict:
                    new_doc.update(update_dict["$set"])
                doc_id = str(new_doc.pop("_id", None) or uuid.uuid4())
                await db.execute(
                    f'INSERT INTO "{self._name}" (doc_id, data) VALUES (?, ?)',
                    (doc_id, _to_json(new_doc)),
                )
            await db.commit()

    async def replace_one(self, filter_dict: dict, replacement: dict, upsert: bool = False):
        await self._ensure()
        async with connect_db(self._db_path) as db:
            matched_id = None
            async with db.execute(f'SELECT doc_id, data FROM "{self._name}"') as cur:
                async for row in cur:
                    doc = self._row_to_doc(row)
                    if _matches(doc, filter_dict):
                        matched_id = row[0]
                        break

            rep = dict(replacement)
            rep.pop("_id", None)

            if matched_id:
                await db.execute(
                    f'UPDATE "{self._name}" SET data = ? WHERE doc_id = ?',
                    (_to_json(rep), matched_id),
                )
            elif upsert:
                doc_id = str(uuid.uuid4())
                await db.execute(
                    f'INSERT INTO "{self._name}" (doc_id, data) VALUES (?, ?)',
                    (doc_id, _to_json(rep)),
                )
            await db.commit()

    async def delete_one(self, filter_dict: dict):
        await self._ensure()
        async with connect_db(self._db_path) as db:
            async with db.execute(f'SELECT doc_id, data FROM "{self._name}"') as cur:
                async for row in cur:
                    doc = self._row_to_doc(row)
                    if _matches(doc, filter_dict):
                        await db.execute(
                            f'DELETE FROM "{self._name}" WHERE doc_id = ?', (row[0],)
                        )
                        await db.commit()

                        class _Result:
                            deleted_count = 1
                        return _Result()

        class _Result:
            deleted_count = 0
        return _Result()

    async def delete_many(self, filter_dict: dict):
        await self._ensure()
        to_delete = []
        async with connect_db(self._db_path) as db:
            async with db.execute(f'SELECT doc_id, data FROM "{self._name}"') as cur:
                async for row in cur:
                    doc = self._row_to_doc(row)
                    if _matches(doc, filter_dict):
                        to_delete.append(row[0])
            for doc_id in to_delete:
                await db.execute(f'DELETE FROM "{self._name}" WHERE doc_id = ?', (doc_id,))
            await db.commit()

        count = len(to_delete)

        class _Result:
            deleted_count = count
        return _Result()

    def find(self, filter_dict: dict | None = None) -> "SQLiteCursor":
        return SQLiteCursor(self, filter_dict or {})


# ── Cursor (returned by .find()) ──────────────────────────────────────────────

class SQLiteCursor:
    def __init__(self, collection: SQLiteCollection, filter_dict: dict) -> None:
        self._col = collection
        self._filter = filter_dict

    async def to_list(self, length: int | None = None) -> list:
        await self._col._ensure()
        results = []
        async with connect_db(self._col._db_path) as db:
            async with db.execute(f'SELECT doc_id, data FROM "{self._col._name}"') as cur:
                async for row in cur:
                    doc = self._col._row_to_doc(row)
                    if _matches(doc, self._filter):
                        results.append(doc)
                        if length is not None and len(results) >= length:
                            break
        return results


# ── Database (collection factory) ─────────────────────────────────────────────

class SQLiteDatabase:
    """
    Mimics the dict-style collection access of motor:
        database["collection_name"].find_one(...)
    """

    def __init__(self, db_path: Path = DB_PATH) -> None:
        self._db_path = Path(db_path)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._collections: dict[str, SQLiteCollection] = {}

    def __getitem__(self, name: str) -> SQLiteCollection:
        if name not in self._collections:
            self._collections[name] = SQLiteCollection(self._db_path, name)
        return self._collections[name]

    def close(self) -> None:
        """No-op — aiosqlite opens/closes connections per operation."""
