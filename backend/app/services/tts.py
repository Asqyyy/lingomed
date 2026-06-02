import websockets
import json
import os
import ssl
from typing import AsyncGenerator

VOICE_IDS = {
    "tirta": os.getenv("DR_TIRTA_VOICE_ID", "moss_audio_a7606e3d-5e89-11f1-b3de-deb486b97a4e"),
    "ghia":  os.getenv("DR_GHIA_VOICE_ID",  "moss_audio_46569d25-5e90-11f1-adb2-f26303c3c234"),
}


async def synthesize_sentence(text: str, persona: str) -> AsyncGenerator[bytes, None]:
    """Stream MP3 audio chunks from MiniMax TTS WebSocket for one sentence."""
    url = "wss://api.minimax.io/ws/v1/t2a_v2"
    headers = {"Authorization": f"Bearer {os.getenv('MINIMAX_API_KEY')}"}
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    voice_id = VOICE_IDS.get(persona, VOICE_IDS["tirta"])

    async with websockets.connect(url, additional_headers=headers, ssl=ssl_context) as ws:
        # wait for connection success
        await ws.recv()

        # start task
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

        # send text
        await ws.send(json.dumps({
            "event": "task_continue",
            "text": text,
        }))

        # finish task
        await ws.send(json.dumps({"event": "task_finish"}))

        # stream audio
        async for msg in ws:
            data = json.loads(msg)
            if data.get("event") == "task_continued" and "data" in data:
                yield bytes.fromhex(data["data"])
            elif data.get("event") == "task_finished":
                break
