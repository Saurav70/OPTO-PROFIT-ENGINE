from fastapi import APIRouter

router = APIRouter()


@router.get("/status", summary="Health check")
def health_check():
    """Lightweight liveness probe for Docker HEALTHCHECK and external uptime monitors."""
    return {"status": "ok"}
