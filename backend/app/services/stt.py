import httpx
import os


async def transcribe(audio_bytes: bytes, language: str = "id") -> str:
    """Send WebM/Opus audio to Deepgram, get Indonesian transcript."""
    url = f"https://api.deepgram.com/v1/listen?model=nova-3&language={language}&smart_format=true"
    headers = {
        "Authorization": f"Token {os.getenv('DEEPGRAM_API_KEY')}",
        "Content-Type": "audio/webm",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, headers=headers, content=audio_bytes)
        resp.raise_for_status()
        result = resp.json()
        try:
            return result["results"]["channels"][0]["alternatives"][0]["transcript"]
        except (KeyError, IndexError):
            return ""
