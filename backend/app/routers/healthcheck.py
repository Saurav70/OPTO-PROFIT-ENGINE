from fastapi import APIRouter

router = APIRouter()


@router.get("/status", summary="Health check (root)")
@router.get("/api/status-hc", summary="Health check (api prefix)")
def health_check():
    """Lightweight liveness probe for Docker HEALTHCHECK and external uptime monitors."""
    return {"status": "ok"}
