# Key Escrow & Database Migration

This document details the architecture and implementation of the **Key Escrow & Database Migration mechanism** in OPTO-PROFIT.

## Problem Statement

OPTO-PROFIT is an offline-first enterprise desktop application. To protect sensitive data and enforce licensing, the application binds its local data to the physical host machine using a unique Hardware ID (HWID).

1. **SQLCipher**: The SQLite database file (`optoprofit.db`) is encrypted entirely using SQLCipher. The encryption key is derived from the machine's HWID.
2. **Fernet (Application-Level Encryption)**: Specific PII columns (like emails, names, phone numbers) and confidential task details are additionally encrypted at the application level using a Fernet key, which is also derived from the HWID.

If a user upgrades their computer or needs to move their `.db` file to a new workstation, the new machine generates a different HWID. As a result:
- SQLCipher cannot open the database.
- Even if the database could be opened, the application cannot decrypt the Fernet-encrypted PII columns.

The database is effectively bricked on any machine other than the original host.

## Solution Architecture

To solve this without compromising the offline, hardware-locked security model, we implemented a **Recovery Phrase-based Migration** mechanism.

### 1. The Recovery Phrase (Key Escrow)

A "Recovery Phrase" acts as a secure, offline backup key.
- The phrase is simply the 16-character Hardware ID (HWID) of the original machine, formatted for human readability (e.g., `XXXX-XXXX-XXXX-XXXX`).
- Users can view and write down this Recovery Phrase from the **Settings > Security & Access** tab in the application.

### 2. Migration Mode Trigger

When the FastAPI backend starts, it attempts to initialize the database in `backend/app/database.py`.
- If the SQLCipher key is incorrect (due to a new HWID), SQLAlchemy raises a `DatabaseError` ("file is not a database" or "encrypted").
- The backend catches this error, logs a warning, and sets a global application state: `MIGRATION_REQUIRED = True`.
- A dedicated FastAPI middleware intercepts all incoming HTTP requests. If `MIGRATION_REQUIRED` is true, all standard `/api/*` requests return a **503 Service Unavailable** status with the detail `"MIGRATION_REQUIRED"`. The only allowed route is the migration endpoint (`/api/migration/*`).

### 3. Frontend Interception

The React frontend handles the 503 error gracefully in the global API client (`frontend/src/services/api.js`).
- Upon detecting the `MIGRATION_REQUIRED` error, the API client dispatches a global `opto-migration` window event.
- `App.jsx` listens for this event. When triggered, it entirely replaces the normal routing stack with the `DatabaseMigration` screen.
- This dedicated UI prompts the user to input their 16-character Recovery Phrase.

### 4. Database Rekeying (The Migration Process)

When the user submits their Recovery Phrase, the frontend sends it to `POST /api/migration/unlock`.

The migration endpoint performs a secure, multi-step transition:

1. **Key Derivation**: The server takes the submitted Recovery Phrase (the old HWID) and derives both the **Old SQLCipher Key** and the **Old Fernet Key**. It also derives the **New SQLCipher Key** and the **New Fernet Key** using the current machine's HWID.
2. **SQLCipher PRAGMA Rekey**:
   - The server connects to the database using the *Old SQLCipher Key*.
   - It executes `PRAGMA rekey = '<new_sqlcipher_key>'`. SQLite decrypts the entire database file in memory and writes it back to disk encrypted with the *New SQLCipher Key*.
3. **Fernet Column Migration**:
   - The server establishes a new connection to the database using the *New SQLCipher Key*.
   - It selects all rows containing Fernet-encrypted PII (Users, Tasks, Config, Profiles).
   - For each encrypted field, it:
     1. Decrypts the cipher text using the *Old Fernet Key*.
     2. Re-encrypts the plaintext using the *New Fernet Key*.
   - It commits these updates back to the database.
4. **Resumption**:
   - The backend clears the `MIGRATION_REQUIRED` flag.
   - The frontend receives a success response and reloads the application, returning the user to the standard login screen with their data fully intact and bound to the new machine.

## Security Considerations

- **No Network Transmission**: The migration process is handled entirely over `localhost`. The Recovery Phrase never leaves the machine.
- **Brute Force Protection**: Standard rate limits apply to the `/api/migration/unlock` endpoint. The SQLCipher key derivation involves PBKDF2 with 600,000 iterations, making brute-forcing the HWID from the database file exceptionally slow.
- **Graceful Failure**: If a migration fails halfway (e.g., power loss), the database file remains encrypted either with the old key or the new key, and the user can simply attempt the migration again or restore from an external `.opto` backup.
