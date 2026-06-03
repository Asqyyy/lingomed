import os
import logging
from typing import AsyncGenerator
from openai import AsyncOpenAI, APIError
from app.prompts.dr_tirta import DR_TIRTA_SYSTEM_PROMPT
from app.prompts.dr_ghia import DR_GHIA_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            api_key=os.getenv("MINIMAX_API_KEY"),
            base_url=os.getenv("MINIMAX_BASE_URL", "https://api.minimax.io/v1"),
        )
    return _client


async def stream_chat(persona: str, messages: list[dict]) -> AsyncGenerator[str, None]:
    """Yield text chunks from MiniMax M3 streaming response."""
    system = DR_TIRTA_SYSTEM_PROMPT if persona == "tirta" else DR_GHIA_SYSTEM_PROMPT
    full_messages = [{"role": "system", "content": system}] + messages
    client = _get_client()

    try:
        stream = await client.chat.completions.create(
            model=os.getenv("LLM_MODEL", "MiniMax-M3"),
            messages=full_messages,
            stream=True,
            temperature=0.8 if persona == "tirta" else 0.7,
        )
    except APIError as e:
        logger.error("MiniMax API error: %s", e)
        raise Exception(f"Layanan AI sedang tidak tersedia ({e.status_code})") from e

    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content
