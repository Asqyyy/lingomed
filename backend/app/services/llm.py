from openai import AsyncOpenAI
import os
from typing import AsyncGenerator
from app.prompts.dr_tirta import DR_TIRTA_SYSTEM_PROMPT
from app.prompts.dr_ghia import DR_GHIA_SYSTEM_PROMPT

_client = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            api_key=os.getenv("MINIMAX_API_KEY"),
            base_url=os.getenv("MINIMAX_BASE_URL", "https://api.minimax.io/v1"),
        )
    return _client


async def stream_chat(persona: str, messages: list) -> AsyncGenerator[str, None]:
    """Yield text chunks from MiniMax M3 streaming response."""
    system = DR_TIRTA_SYSTEM_PROMPT if persona == "tirta" else DR_GHIA_SYSTEM_PROMPT
    full_messages = [{"role": "system", "content": system}] + messages
    client = _get_client()
    stream = await client.chat.completions.create(
        model=os.getenv("LLM_MODEL", "MiniMax-M3"),
        messages=full_messages,
        stream=True,
        temperature=0.8 if persona == "tirta" else 0.7,
    )
    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content
