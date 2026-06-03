from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from app.services.llm import stream_chat
from app.rate_limit import limiter
import json
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class ChatRequest(BaseModel):
    persona: str
    message: str
    history: list[dict] = Field(default_factory=list)


@router.post("/api/{persona}/chat")
@limiter.limit("20/minute")
async def chat(persona: str, req: ChatRequest, request: Request):
    if persona not in ("tirta", "ghia"):
        raise HTTPException(400, "persona must be 'tirta' or 'ghia'")

    async def event_generator():
        try:
            messages = req.history + [{"role": "user", "content": req.message}]
            async for chunk in stream_chat(persona, messages):
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            yield 'data: {"done": true}\n\n'
        except Exception as e:
            logger.error("LLM streaming error for persona %s: %s", persona, e)
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
