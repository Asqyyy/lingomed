import websockets
import json
import os
import logging
from typing import AsyncGenerator

logger = logging.getLogger(__name__)

VOICE_IDS = {
    "tirta": os.getenv("DR_TIRTA_VOICE_ID", "moss_audio_a7606e3d-5e89-11f1-b3de-deb486b97a4e"),
    "ghia":  os.getenv("DR_GHIA_VOICE_ID",  "moss_audio_46569d25-5e90-11f1-adb2-f26303c3c234"),
}


async def synthesize_sentence(text: str, persona: str) -> AsyncGenerator[bytes, None]:
    """Stream MP3 audio chunks from MiniMax TTS WebSocket for one sentence."""
    url = "wss://api.minimax.io/ws/v1/t2a_v2"
    headers = {"Authorization": f"Bearer {os.getenv('MINIMAX_API_KEY')}"}

    voice_id = VOICE_IDS.get(persona, VOICE_IDS["tirta"])

    async with websockets.connect(url, additional_headers=headers) as ws:
        # ── Wait for the server's greeting / connection-ready message ──────
        first_msg = await ws.recv()
        if isinstance(first_msg, str):
            try:
                first_data = json.loads(first_msg)
                base_resp = first_data.get("base_resp", {})
                status_code = base_resp.get("status_code")
                # status_code 0 means success; any other value is an error
                if status_code is not None and status_code != 0:
                    status_msg = base_resp.get("status_msg", "unknown error")
                    raise Exception(f"MiniMax TTS rejected connection: [{status_code}] {status_msg}")
            except json.JSONDecodeError:
                pass  # Not JSON — some servers send a plain string, ignore

        # ── Start task ─────────────────────────────────────────────────────
        await ws.send(json.dumps({
            "event": "task_start",
            "model": os.getenv("TTS_MODEL", "speech-2.8-hd"),
            "voice_setting": {
                "voice_id": voice_id,
                "speed": 1.0,
                "vol": 1.0,
                "pitch": 0,
            },
            "audio_setting": {
                "sample_rate": int(os.getenv("TTS_SAMPLE_RATE", "32000")),
                "bitrate": 128000,
                "format": os.getenv("TTS_FORMAT", "mp3"),
            },
        }))

        # ── Send text ──────────────────────────────────────────────────────
        await ws.send(json.dumps({"event": "task_continue", "text": text}))

        # ── Signal end of text ─────────────────────────────────────────────
        await ws.send(json.dumps({"event": "task_finish"}))

        # ── Stream audio chunks back ───────────────────────────────────────
        async for msg in ws:
            if isinstance(msg, bytes):
                # Raw binary audio frame — yield directly
                yield msg
                continue

            try:
                data = json.loads(msg)
            except json.JSONDecodeError:
                logger.warning("TTS: received non-JSON text frame, skipping")
                continue

            event = data.get("event")

            if event == "task_continued" and "data" in data:
                # Hex-encoded audio in a JSON envelope
                try:
                    yield bytes.fromhex(data["data"])
                except ValueError:
                    logger.warning("TTS: invalid hex data in task_continued")

            elif event == "task_finished":
                break

            elif event == "task_failed":
                err = data.get("base_resp", {}).get("status_msg", "unknown TTS error")
                raise Exception(f"MiniMax TTS task failed: {err}")
