import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "")
    MINIMAX_API_KEY = os.getenv("MINIMAX_API_KEY", "")
    MINIMAX_BASE_URL = os.getenv("MINIMAX_BASE_URL", "https://api.minimax.io/v1")
    LLM_MODEL = os.getenv("LLM_MODEL", "MiniMax-M3")
    TTS_MODEL = os.getenv("TTS_MODEL", "speech-2.8-hd")
    TTS_FORMAT = os.getenv("TTS_FORMAT", "mp3")
    TTS_SAMPLE_RATE = int(os.getenv("TTS_SAMPLE_RATE", "32000"))
    DR_TIRTA_VOICE_ID = os.getenv(
        "DR_TIRTA_VOICE_ID",
        "moss_audio_a7606e3d-5e89-11f1-b3de-deb486b97a4e"
    )
    DR_GHIA_VOICE_ID = os.getenv(
        "DR_GHIA_VOICE_ID",
        "moss_audio_46569d25-5e90-11f1-adb2-f26303c3c234"
    )
    ALLOWED_ORIGINS = [
        origin.strip() 
        for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",") 
        if origin.strip()
    ]

    @classmethod
    def validate(cls):
        if not cls.DEEPGRAM_API_KEY:
            raise RuntimeError("DEEPGRAM_API_KEY is not set")
        if not cls.MINIMAX_API_KEY:
            raise RuntimeError("MINIMAX_API_KEY is not set")

config = Config()
