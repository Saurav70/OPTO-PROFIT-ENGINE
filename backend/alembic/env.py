"""Alembic environment for OPTO-PROFIT (ported — Segment 4).

Uses the application's OWN engine (app.database.engine) so migrations inherit
the SQLCipher driver + PRAGMA key wiring on production builds — a plain
sqlite:// URL could not open an encrypted database.

render_as_batch=True is required for SQLite ALTER/constraint operations.
"""

from logging.config import fileConfig

from alembic import context

from app.database import Base, engine as app_engine
from app import sql_models  # noqa: F401 — register all ORM models with Base.metadata

# Alembic Config object — provides access to alembic.ini values.
config = context.config

# Interpret the config file for Python logging if present.
# disable_existing_loggers=False keeps the application's loggers alive when
# migrations are invoked programmatically from init_db().
if config.config_file_name is not None:
    fileConfig(config.config_file_name, disable_existing_loggers=False)

# Model metadata for autogenerate support.
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (emit SQL to stdout, no DB connection)."""
    context.configure(
        url=str(app_engine.url),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode via the application's engine.

    Using app.database.engine (instead of engine_from_config) inherits the
    SQLCipher driver/creator and PRAGMA key on production builds.
    """
    with app_engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
