from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "ok", "app": "LingoMed", "version": "0.1.0"}
