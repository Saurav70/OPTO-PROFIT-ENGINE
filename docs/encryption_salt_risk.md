# Encryption Salt File — Critical Risk Notice

## What is this?

OPTO-PROFIT derives the Fernet encryption key for all sensitive database columns (emails, names, phone numbers, task details) using **PBKDF2-HMAC-SHA256** with two inputs:

1. The machine's **Hardware ID (HWID)** — captured at runtime from CPU and baseboard serial numbers.
2. A **persistent random salt** stored at: `%APPDATA%\OPTO-PROFIT\fernet.salt`

This salt is generated once on first launch and never changes.

## Why does the salt matter?

Without the salt, it is impossible to reconstruct the correct Fernet key — even if you know the exact HWID. This means:

> **If the salt file is lost, all Fernet-encrypted data in the database is permanently unrecoverable — even if you have the original machine.**

## Failure Scenarios

| Scenario | Impact |
|---|---|
| OS reinstall on same hardware | ❌ Salt lost → data unrecoverable |
| New motherboard (HWID changes) | ⚠️ Use Recovery Phrase to migrate |
| Salt file + DB file backed up together | ✅ Safe to restore |
| DB file backed up, salt file lost | ❌ Fernet data unrecoverable |

## Mitigation Options

### Option 1: Export via `.opto` files (Recommended)
Before performing an OS reinstall or hardware change, export your project data using the built-in **File → Export `.opto`** feature. This saves all data in a portable, decrypted-then-re-encrypted format.

### Option 2: Back up the AppData folder
Include `%APPDATA%\OPTO-PROFIT\` in your backup plan. This folder contains:
- `data.db` — the SQLite database
- `fernet.salt` — the encryption salt (**critical**)
- `license.dat` — your license key

### Option 3: Future Enhancement
A future version may include a "Vault Backup" feature that encrypts the salt into the `.opto` export. Tracked in: `docs/roadmap.md`.

## Developer Notes

The salt is generated in `backend/app/sql_models.py` → `get_fernet()` and loaded from `backend/app/paths.py` → `get_persistent_salt_path()`.

To inspect or back up the salt path from code:
```python
from app.paths import get_persistent_salt_path
print(get_persistent_salt_path())
# Outputs: C:\Users\<user>\AppData\Roaming\OPTO-PROFIT\fernet.salt
```
