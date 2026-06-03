from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import re
import logging
from app.services.stt import transcribe
from app.services.llm import stream_chat
from app.services.tts import synthesize_sentence
from app.rate_limit import check_ws_rate_limit

router = APIRouter()
logger = logging.getLogger(__name__)

# Sentence split on . ! ? followed by whitespace or end-of-string
SENTENCE_SPLIT = re.compile(r'(?<=[.!?])\s+|(?<=[.!?])$')

# Max audio payload per turn: 10 MB
MAX_AUDIO_BYTES = 10 * 1024 * 1024


def _split_sentences(text: str) -> list[str]:
    """Split text into TTS-friendly sentence chunks."""
    text = text.strip()
    if not text:
        return []
    parts = SENTENCE_SPLIT.split(text)
    return [p.strip() for p in parts if p.strip()]


def _group_sentences(sentences: list[str], min_words: int = 4) -> list[str]:
    """
    Merge very short fragments with the next one so TTS doesn't get called
    with single-word chunks (bad for prosody and API efficiency).
    """
    grouped: list[str] = []
    current = ""
    for s in sentences:
        current = (current + " " + s).strip() if current else s
        if len(current.split()) >= min_words:
            grouped.append(current)
            current = ""
    if current:
        grouped.append(current)
    return grouped


@router.websocket("/ws/{persona}")
async def voice_ws(websocket: WebSocket, persona: str):
    if persona not in ("tirta", "ghia"):
        await websocket.close(code=4000)
        return

    # Check rate limit before accepting (IP from scope)
    client_ip = websocket.client.host if websocket.client else "unknown"
    if not check_ws_rate_limit(client_ip):
        # Must accept first before we can send, then close immediately
        await websocket.accept()
        await websocket.send_json({"type": "error", "stage": "connection", "detail": "Terlalu banyak koneksi. Coba lagi dalam 1 menit."})
        await websocket.close(code=4008)
        return

    await websocket.accept()
    logger.info("Voice WS accepted for persona=%s ip=%s", persona, client_ip)

    # Rolling conversation history per WebSocket session (last 10 messages)
    history: list[dict] = []

    try:
        while True:
            # ── Phase 1: collect audio chunks until end_of_speech ──────────
            audio_chunks: list[bytes] = []
            total_bytes = 0

            while True:
                msg = await websocket.receive()

                if msg["type"] == "websocket.disconnect":
                    logger.info("Client disconnected (persona=%s)", persona)
                    raise WebSocketDisconnect()

                if msg["type"] != "websocket.receive":
                    continue

                if "bytes" in msg and msg["bytes"]:
                    chunk = msg["bytes"]
                    total_bytes += len(chunk)
                    if total_bytes > MAX_AUDIO_BYTES:
                        await websocket.send_json({
                            "type": "error",
                            "stage": "stt",
                            "detail": "Rekaman terlalu panjang (maks 10 MB).",
                        })
                        audio_chunks = []
                        total_bytes = 0
                        # Don't break — wait for end_of_speech to clear state
                        continue
                    audio_chunks.append(chunk)

                elif "text" in msg and msg["text"]:
                    try:
                        data = json.loads(msg["text"])
                        if data.get("type") == "end_of_speech":
                            break
                    except json.JSONDecodeError:
                        pass  # Ignore malformed text frames

            if not audio_chunks:
                # Size limit exceeded or empty recording — skip this turn
                continue

            audio_bytes = b"".join(audio_chunks)

            # ── Phase 2: STT ───────────────────────────────────────────────
            try:
                user_text = await transcribe(audio_bytes, language="id")
            except Exception as e:
                logger.warning("STT error (persona=%s): %s", persona, e)
                await websocket.send_json({"type": "error", "stage": "stt", "detail": str(e)})
                continue

            if not user_text.strip():
                await websocket.send_json({"type": "transcript", "text": "", "is_final": True})
                continue

            await websocket.send_json({"type": "transcript", "text": user_text, "is_final": True})
            logger.info("Transcript (persona=%s): %s", persona, user_text[:80])

            # ── Phase 3: LLM streaming ─────────────────────────────────────
            full_response = ""
            messages = history + [{"role": "user", "content": user_text}]

            try:
                async for chunk in stream_chat(persona, messages):
                    full_response += chunk
                    await websocket.send_json({"type": "llm_chunk", "text": chunk})
            except Exception as e:
                logger.error("LLM error (persona=%s): %s", persona, e)
                await websocket.send_json({"type": "error", "stage": "llm", "detail": str(e)})
                continue

            # Persist turn in rolling history
            history.append({"role": "user", "content": user_text})
            history.append({"role": "assistant", "content": full_response})
            history = history[-10:]  # keep last 5 turns (10 messages)

            # ── Phase 4: TTS per sentence chunk ───────────────────────────
            sentences = _split_sentences(full_response)
            groups = _group_sentences(sentences)

            for sentence in groups:
                try:
                    async for mp3_chunk in synthesize_sentence(sentence, persona):
                        await websocket.send_bytes(mp3_chunk)
                except Exception as e:
                    logger.warning("TTS error (persona=%s): %s", persona, e)
                    await websocket.send_json({"type": "error", "stage": "tts", "detail": str(e)})

            await websocket.send_json({"type": "done", "text": full_response})

    except WebSocketDisconnect:
        logger.info("Voice WS closed (persona=%s ip=%s)", persona, client_ip)
