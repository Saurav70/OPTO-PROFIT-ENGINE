# 5. Security, Authentication, & Hardware Licensing

Given its deployment on physical factory floors, OPTO-PROFIT treats internal IP security as a primary concern. The application deploys multiple overlapping cryptography layers to ensure that even if the physical hard drive is cloned, the proprietary algorithms and task data remain impenetrable.

## 5.1 Hardware-Locked Licensing (HWID)
OPTO-PROFIT natively implements strict node-locking via Ed25519 asymmetric cryptography. 

During compilation, a script (`keygen.py`) generates an Ed25519 key pair. The private key remains secured off-site on vendor systems, while the public key (`public_key.hex`) is hardcoded into the compiled `OPTO-PROFIT.exe` binary payload.

When a client purchases the software, they execute an onboard script to extract their host machine's Hardware ID (`wmic csproduct get uuid`). The vendor generates a JSON payload containing the client's information and HWID, signs it with the private key, and issues a Base64-encoded license string.

Upon application boot, a License Gate Middleware intercepts all `/api/*` requests. It reads the local `license.dat` file, extracts the signature, and validates it against the embedded public key and the active machine's HWID. If the HWID does not perfectly match (i.e., the software was copied to a different PC), the middleware returns `403 Forbidden`, instantly halting the backend API.

## 5.2 Database Encryption at Rest
To prevent unauthorized parties from opening the `optoprofit.db` SQLite file in a DB browser, sensitive text strings (like task configurations and financial variables) are encrypted at rest. 

SQLAlchemy models implement custom `EncryptedString` and `EncryptedText` datatypes. When a value is flushed to the database, a Fernet symmetric encryption key—derived dynamically via PBKDF2HMAC from the machine's HWID—encrypts the payload. 
Consequently, the database is completely coupled to the physical motherboard of the host machine; transferring the `.db` file to a foreign workstation yields only indecipherable ciphertexts.

## 5.3 Authentication & Session Protocols
1. **Password Cryptography**: User passwords are encrypted using `passlib` implementing the `bcrypt` algorithm (PBKDF2-HMAC-SHA256). 
2. **Two-Factor Authentication (TOTP)**: The system supports Time-Based One-Time Passwords via the `pyotp` library, ensuring an offline second factor via a standard Authenticator app.
3. **Dual-Mode Tokens**: Standard JWTs are signed via HS256. For internal API calls, these are securely stored in `HttpOnly` cookies. For real-time `websockets`, the token is passed in the first frame of the connection payload to prevent token leakage in URL query strings.
4. **Rate Limiting**: Despite being an offline application, OPTO-PROFIT employs `slowapi` rate limiters on login routes (e.g., 3 attempts/minute) to mitigate localized brute-force dictionary attacks from malicious internal actors, culminating in a 15-minute account lockout after 5 failures.
