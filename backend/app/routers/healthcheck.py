from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/status", summary="Health check")
def health_check():
    # In a real application, you might want to check database connections, etc.
    return {"status": "ok"}
