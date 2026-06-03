from fastapi import APIRouter, HTTPException
from app.config import config

router = APIRouter()


@router.get("/health")
async def health():
    if not config.DEEPGRAM_API_KEY or not config.MINIMAX_API_KEY:
        raise HTTPException(status_code=503, detail="API keys not configured")
    return {"status": "ok", "app": "LingoMed", "version": "0.1.0"}
