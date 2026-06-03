import httpx
import os
import logging

logger = logging.getLogger(__name__)


async def transcribe(audio_bytes: bytes, language: str = "id") -> str:
    """Send WebM/Opus audio to Deepgram nova-3, return Indonesian transcript."""
    url = (
        f"https://api.deepgram.com/v1/listen"
        f"?model=nova-3&language={language}&smart_format=true"
    )
    headers = {
        "Authorization": f"Token {os.getenv('DEEPGRAM_API_KEY')}",
        "Content-Type": "audio/webm",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.post(url, headers=headers, content=audio_bytes)
            resp.raise_for_status()
            result = resp.json()
            transcript = result["results"]["channels"][0]["alternatives"][0]["transcript"]
            logger.info("STT transcript (%d bytes audio): %s", len(audio_bytes), transcript[:80])
            return transcript
        except httpx.TimeoutException:
            raise Exception("Koneksi ke server speech-to-text timeout. Coba lagi.")
        except httpx.HTTPStatusError as e:
            logger.error("Deepgram HTTP error %s: %s", e.response.status_code, e.response.text[:200])
            raise Exception(f"Gagal memproses suara (Error {e.response.status_code})")
        except (KeyError, IndexError):
            # Deepgram returned a valid response but transcript is empty
            logger.warning("Deepgram returned empty transcript for %d bytes", len(audio_bytes))
            return ""
