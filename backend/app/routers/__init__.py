# OPTO-PROFIT Routers Package
# ────────────────────────────────────────────────────────────────────
# Router modules:
#   analytics   — /api/analytics/*
#   auth        — /api/auth/*, /api/users/me
#   data        — /api/config, /api/profiles/*
#   healthcheck — /api/health
#   migration   — /api/migration/*
#   tasks       — /api/tasks/*

from . import analytics, auth, data, healthcheck, migration, tasks

__all__ = ["analytics", "auth", "data", "healthcheck", "migration", "tasks"]
