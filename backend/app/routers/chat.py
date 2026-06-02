from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.services.llm import stream_chat

router = APIRouter()


class ChatRequest(BaseModel):
    persona: str
    message: str
    history: list = []


@router.post("/api/{persona}/chat")
async def chat(persona: str, req: ChatRequest):
    if persona not in ("tirta", "ghia"):
        raise HTTPException(400, "persona must be 'tirta' or 'ghia'")

    async def event_generator():
        messages = req.history + [{"role": "user", "content": req.message}]
        async for chunk in stream_chat(persona, messages):
            yield f"data: {{\"chunk\": {chunk!r}}}\n\n"
        yield "data: {\"done\": true}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
