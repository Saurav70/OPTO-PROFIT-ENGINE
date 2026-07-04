# 4. Database Schema & Data Modeling

## 4.1 Local Persistence Layer
OPTO-PROFIT employs **SQLite** (`optoprofit.db`) as its core persistence layer. SQLite was deliberately selected to fulfill the offline-first mandate, as it requires no secondary daemon processes, runs securely as a single-file flat database on the host filesystem, and seamlessly compiles into the PyInstaller bundle.

Data transactions are marshaled by **SQLAlchemy 2.0**, utilizing standard Object-Relational Mapping (ORM) paradigms and Pydantic validators to ensure absolute referential integrity.

## 4.2 Entity-Relationship Architecture

The schema employs a centralized `users` table serving as the root node for all foreign key relationships, establishing isolated user profiles on the local machine.

### Core Tables

1. **`users`**
   - **Primary Key:** `id` (UUID String)
   - **Attributes:** `username`, `email`, `password_hash` (bcrypt), `created_at`, `is_2fa_enabled` (Boolean), `two_factor_secret` (TOTP seed).
   - **Security:** Incorporates `failed_login_attempts` and `locked_until` columns to natively throttle brute-force offline attacks.

2. **`tasks`**
   - **Primary Key:** `pk` (Integer, auto-increment)
   - **Foreign Keys:** `user_id` (mapped to `users`), `tenant_id`
   - **Composite Unique Constraint:** `(task_id, user_id)`
   - **Attributes:** `name`, `time` (Float).
   - **JSON Blobs:** Predecessor dependencies and dynamic key-value pairs (like specific tooling requirements) are stored in `predecessors_json` and `custom_attributes_json` text columns. The ORM utilizes Python `@property` getters/setters to transparently serialize this data into Python dictionaries upon retrieval.

3. **`config`**
   - **Foreign Key:** `user_id` (UNIQUE constraint enforces a 1:1 relationship).
   - **Attributes:** `data_json` (Text).
   - **Purpose:** Stores the entirety of the project's macro parameters (Financial variables, custom formulas, zone definitions, constraint lists, and layout presets). Storing this as a normalized JSON blob allows the flexible, user-driven formula engine to mutate state without requiring structural schema migrations.

4. **`profiles`**
   - **Attributes:** `name`, `timestamp`, `data_json`.
   - **Purpose:** Functions as a temporal snapshot registry. When a user creates a baseline or saves an optimized matrix, the entire `tasks` and `config` state is serialized and frozen in `data_json`, allowing historical rollback and direct side-by-side financial comparisons.

5. **`sessions`**
   - **Primary Key:** `id`
   - **Attributes:** `token_hash` (SHA-256), `user_id`, `expires_at`.
   - **Purpose:** Rather than blindly trusting stateless JWTs, the database maintains a strict session registry. Upon logout or token invalidation, the session record is purged, forcing subsequent JWT validations to fail.

## 4.3 Multi-Tenant Workspaces (Local Scoping)
Though OPTO-PROFIT is an offline application, it inherently supports internal Multi-Tenancy via a `tenant_id` column present on all core models. This allows multiple engineering shifts or departments sharing the same workstation terminal to cleanly isolate their project spaces, preventing a night-shift engineer from accidentally mutating the day-shift's active assembly configurations.
