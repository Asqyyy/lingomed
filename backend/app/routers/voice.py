from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import re
from app.services.stt import transcribe
from app.services.llm import stream_chat
from app.services.tts import synthesize_sentence

router = APIRouter()

SENTENCE_SPLIT = re.compile(r'(?<=[.!?])\s+|(?<=[.!?])$')


async def split_sentences(text: str):
    """Split text into sentences for chunked TTS."""
    text = text.strip()
    if not text:
        return []
    parts = SENTENCE_SPLIT.split(text)
    return [p.strip() for p in parts if p.strip()]


@router.websocket("/ws/{persona}")
async def voice_ws(websocket: WebSocket, persona: str):
    if persona not in ("tirta", "ghia"):
        await websocket.close(code=4000)
        return

    await websocket.accept()
    try:
        while True:
            # Receive audio bytes
            audio_bytes = await websocket.receive_bytes()

            # STT
            try:
                user_text = await transcribe(audio_bytes, language="id")
            except Exception as e:
                await websocket.send_json({"type": "error", "stage": "stt", "detail": str(e)})
                continue

            if not user_text.strip():
                await websocket.send_json({"type": "transcript", "text": "", "is_final": True})
                continue

            await websocket.send_json({"type": "transcript", "text": user_text, "is_final": True})

            # LLM streaming
            full_response = ""
            async for chunk in stream_chat(persona, [{"role": "user", "content": user_text}]):
                full_response += chunk
                await websocket.send_json({"type": "llm_chunk", "text": chunk})

            # TTS per sentence
            sentences = await split_sentences(full_response)
            for sentence in sentences:
                try:
                    async for mp3_chunk in synthesize_sentence(sentence, persona):
                        await websocket.send_bytes(mp3_chunk)
                except Exception as e:
                    await websocket.send_json({"type": "error", "stage": "tts", "detail": str(e)})

            await websocket.send_json({"type": "done", "text": full_response})

    except WebSocketDisconnect:
        pass
