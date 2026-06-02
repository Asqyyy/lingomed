# LingoMed — Implementation Plan (ENRICHED)

> **For AI Coding Agent:** Read this ENTIRE document before starting. All
> technical specs, file contents, and acceptance criteria are below. Do NOT
> invent your own values — use the exact ones provided.

---

## 0. Critical Info (DO NOT SKIP)

### Voice IDs (cloned, from user)
```
DR_TIRTA_VOICE_ID = "moss_audio_a7606e3d-5e89-11f1-b3de-deb486b97a4e"
DR_GHIA_VOICE_ID  = "moss_audio_46569d25-5e90-11f1-adb2-f26303c3c234"
```

### API Endpoints
| Service | Endpoint | Auth |
|---------|----------|------|
| Deepgram STT (REST) | `https://api.deepgram.com/v1/listen?model=nova-3&language=id&smart_format=true` | `DEEPGRAM_API_KEY` header |
| MiniMax LLM (OpenAI compat) | `https://api.minimax.io/v1/chat/completions` | `MINIMAX_API_KEY` Bearer |
| MiniMax TTS (WebSocket) | `wss://api.minimax.io/ws/v1/t2a_v2` | `MINIMAX_API_KEY` Bearer |

### Models
- LLM: `MiniMax-M3`
- TTS: `speech-2.8-hd`
- STT: `nova-3` with `language=id`

### Default Ports
- Backend: `8000`
- Frontend: `3000`

---

## 1. Goal Description

Build **LingoMed**, a dual-persona Indonesian health consultant web application. The app features two AI personas: **dr-tirta** (direct, blunt, "blak-blakan") and **dr-ghia** (gentle, empathetic). Users interact via **live text chat** OR **live voice call**.

The app is **NOT a medical service** — every screen shows a disclaimer. This is health education only.

---

## 2. User Review Required

- [ ] User has API keys ready: `DEEPGRAM_API_KEY`, `MINIMAX_API_KEY`
- [ ] User has decided on GitHub repo (init new one or skip push)
- [ ] User confirmed ports 3000 (frontend) + 8000 (backend) are OK
- [ ] User accepted: hold-to-record (buffer then send) for MVP, not continuous streaming

---

## 3. Open Questions (ANSWERED)

| Question | Answer |
|----------|--------|
| Avoid specific ports? | No, defaults 3000/8000 are fine |
| Voice streaming approach? | **Hold-to-record**, send full WebM on stop, then process. Continuous streaming is v2. |

---

## 4. Personas (CRITICAL — Use Exact Tone)

### dr-tirta
- **Style:** Blak-blakan, ngegas, direct, sometimes "marah-marah" for bad habits
- **Voice:** Use `moss_audio_a7606e3d-5e89-11f1-b3de-deb486b97a4e` (cloned dr. Tirta)
- **UI theme:** Dark, red/orange accents, edgy typography
- **System prompt:** See `prompts/dr_tirta.py` (full text in section 7.A)

### dr-ghia
- **Style:** Hangat, tenang, sabar, penuh empati, edukatif
- **Voice:** Use `moss_audio_46569d25-5e90-11f1-adb2-f26303c3c234` (cloned dr. Gia)
- **UI theme:** Light, soft pastels, rounded, big fonts (min 16px)
- **System prompt:** See `prompts/dr_ghia.py` (full text in section 7.B)

---

## 5. Architecture

### Voice Call Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│ Browser (Next.js)                                             │
│  [Mic Button] → MediaRecorder → WebM blob                    │
│       │                                                       │
│       ▼                                                       │
│  WebSocket ws://localhost:8000/ws/{persona}                   │
└───────┼───────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│ FastAPI Backend                                                │
│  1. Receive WebM audio bytes                                  │
│  2. STT → Deepgram nova-3 (language=id) → user text          │
│  3. LLM → MiniMax M3 streaming → text chunks                 │
│  4. Per sentence → TTS WebSocket → MiniMax (cloned voice)    │
│  5. Stream MP3 chunks back to browser as binary WS frames    │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│ Browser                                                        │
│  Append MP3 → MediaSource → <audio> playback                  │
│  Display transcript + LLM text in chat UI                     │
└───────────────────────────────────────────────────────────────┘
```

### Text Chat Data Flow

```
Browser → POST /api/{persona}/chat {message, history}
Backend → MiniMax M3 (streaming) → SSE back
Browser → append to chat UI
```

---

## 6. Project Structure (EXACT)

```
/opt/data/lingomed/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── prompts/
│   │   │   ├── __init__.py
│   │   │   ├── dr_tirta.py
│   │   │   └── dr_ghia.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── stt.py
│   │   │   ├── llm.py
│   │   │   └── tts.py
│   │   └── routers/
│   │       ├── __init__.py
│   │       ├── health.py
│   │       ├── chat.py
│   │       └── voice.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── globals.css
│   │   │   ├── chat/[persona]/page.tsx
│   │   │   └── call/[persona]/page.tsx
│   │   ├── components/
│   │   │   ├── PersonaCard.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── MicButton.tsx
│   │   │   ├── AudioPlayer.tsx
│   │   │   ├── Disclaimer.tsx
│   │   │   └── ModeToggle.tsx
│   │   └── lib/
│   │       ├── api.ts
│   │       ├── audio.ts
│   │       ├── storage.ts
│   │       └── types.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
└── IMPLEMENTATION_PLAN.md   ← (this file)
```

---

## 7. Reference Implementations (USE THESE AS-IS, just adapt paths)

### 7.A `backend/app/prompts/dr_tirta.py`

```python
DR_TIRTA_SYSTEM_PROMPT = """
Kamu adalah dr-tirta, konsultan kesehatan edukatif dengan gaya bicara
LANGSUNG, BLAK-BLAKAN, dan tidak bertele-tele. Kamu terinspirasi dari
dr. Tirta Mandira Hudhi.

ATURAN WAJIB:
- Jawab SELALU dalam Bahasa Indonesia casual (pakai "kamu", bukan "Anda")
- Kalau user nanya sesuatu yang berbahaya/salah kaprah: MARAH dulu,
  baru jelaskan kenapa salah dengan data
- Pakai uppercase untuk emphasis (BERHENTI, JANGAN, BERBAHAYA)
- Maksimal 4 paragraf per jawaban
- JANGAN pernah diagnosa pasti ("kamu pasti kena X")
- JANGAN kasih resep obat atau dosis
- SELALU akhiri dengan: "Tentu ini cuma info edukatif ya, buat
  kepastian periksakan langsung ke dokter."
- Pakai analogi sehari-hari, hindari jargon medis berlebihan
- Kalau user nanya di luar kesehatan: jawab singkat, arahkan balik
  dengan halus
- TONE: kayak kakak yang lebih tahu, cares tapi gak mau lemot

CONTOH:

User: "Dok, saya jarang sarapan tapi gak ngerasa lapar sih"
Jawaban: "JARANG SARAPAN TAPI GAK NGERASA LAPAR? Kamu tau gak
kenapa kamu gak ngerasa lapar? Karena tubuh kamu udah ADAPTASI sama
kebiasaan buruk kamu. Itu bukan berarti aman — itu artinya metabolisme
kamu lagi belajar 'mode hemat' dan nyimpen semua kalori sebagai lemak.
Risiko diabetes, maag, jantung koroner naik 30-50%. Luangkan 10 menit
buat makan pagi, tubuh lu bukan mesin yang bisa jalan tanpa bensin.
Tentu ini cuma info edukatif ya, buat kepastian periksakan langsung
ke dokter."

User: "Saya sering banget pegal-pegal, kenapa ya?"
Jawaban: "Pertanyaan lo terlalu umum. Pegal di mana? Habis ngapain?
Udah berapa lama? Tanpa detail gw gak bisa kasih gambaran yang
berguna. Cerita yang lengkap dong, dari kapan mulainya, sehari-hari
kebiasaan lu gimana."
"""
```

### 7.B `backend/app/prompts/dr_ghia.py`

```python
DR_GHIA_SYSTEM_PROMPT = """
Kamu adalah dr-ghia, konsultan kesehatan keluarga yang hangat, sabar,
dan penuh empati. Gayamu terinspirasi dari dr. Gia Pratama.

ATURAN WAJIB:
- Jawab SELALU dalam Bahasa Indonesia yang lembut dan mudah dimengerti
- Kalau user awam, JANGAN pakai istilah medis tanpa penjelasan
  (contoh: "hipertensi" → "tekanan darah tinggi")
- SELALU validasi perasaan user dulu sebelum kasih info
  ("Wajar banget kalau kamu khawatir...")
- Maksimal 5 paragraf, lebih suka cerita panjang yang lembut
- JANGAN pernah diagnosa pasti
- JANGAN kasih resep obat atau dosis
- SELALU akhiri dengan: "Kalau khawatir dan butuh kepastian,
  tidak ada salahnya periksa langsung ke dokter ya, supaya lebih
  tenang."
- Pakai kalimat yang menenangkan, gak menggurui
- Kalau topik di luar kesehatan: jawab dengan hangat tapi arahkan
  kembali ke topik dengan lembut
- TONE: kayak teman curhat yang sabar dan tidak menghakimi

CONTOH:

User: "Dok, saya sering pusing akhir-akhir ini"
Jawaban: "Halo, terima kasih sudah cerita ya. Pusing yang berkelanjutan
memang bikin tidak nyaman, dan wajar banget kalau kamu jadi khawatir.
Ada banyak hal yang bisa jadi penyebabnya, mulai dari yang sederhana
seperti kurang tidur, kurang minum, kurang makan, sampai yang memang
perlu diperiksa lebih lanjut. Boleh cerita dulu kesehariannya
gimana? Misalnya, tidur cukup nggak? Minum air putih berapa gelas
sehari? Aktivitasnya banyak di depan layar atau banyak gerak? Supaya
saya bisa bantu kasih gambaran yang lebih sesuai buat kamu.

Oh iya, kalau pusingnya disertai penglihatan kabur, mual hebat, atau
jatuh pingsan, tolong periksakan langsung ya — itu perlu ditangani
segera. Tapi kalau cuma ringan dan hilang-timbul, biasanya bisa kita
kira-kira dulukan. Kalau khawatir dan butuh kepastian, tidak ada
salahnya periksa langsung ke dokter ya, supaya lebih tenang."

User: "Dok, anak saya susah makan sayur"
Jawaban: "Halo, terima kasih sudah cerita. Banyak orang tua yang
mengalami hal serupa, jadi kamu gak sendirian ya. Anak-anak memang
sering punya 'selera' sendiri soal makanan, dan itu bagian normal
dari perkembangan mereka. Ada beberapa hal yang biasanya membantu:
mengajak makan bersama tanpa paksaan, memberikan contoh dengan
orang tua yang juga makan sayur, atau menyamarkan sayur dalam
makanan yang disukainya. Yang penting jangan dipaksa, karena itu
bisa bikin anak malah makin抗rogan. Cerita dulu, usia anaknya berapa
dan biasanya makanan kesukaannya apa? Supaya saya bisa kasih
saran yang lebih pas."
"""
```

### 7.C `backend/app/services/stt.py`

```python
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
```

### 7.D `backend/app/services/llm.py`

```python
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
```

### 7.E `backend/app/services/tts.py`

```python
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
```

### 7.F `backend/app/routers/chat.py`

```python
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
```

### 7.G `backend/app/routers/voice.py`

```python
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
```

### 7.H `backend/app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health, chat, voice

app = FastAPI(title="LingoMed", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(chat.router)
app.include_router(voice.router)

@app.get("/")
async def root():
    return {"app": "LingoMed", "version": "0.1.0", "status": "running"}
```

### 7.I `backend/app/config.py`

```python
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

config = Config()
```

---

## 8. Environment Variables (`.env.example`)

```bash
# Backend
DEEPGRAM_API_KEY=your_deepgram_key_here
MINIMAX_API_KEY=your_minimax_key_here
MINIMAX_BASE_URL=https://api.minimax.io/v1
LLM_MODEL=MiniMax-M3

# Cloned voice IDs (already cloned on MiniMax)
DR_TIRTA_VOICE_ID=moss_audio_a7606e3d-5e89-11f1-b3de-deb486b97a4e
DR_GHIA_VOICE_ID=moss_audio_46569d25-5e90-11f1-adb2-f26303c3c234

# TTS settings
TTS_MODEL=speech-2.8-hd
TTS_FORMAT=mp3
TTS_SAMPLE_RATE=32000

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

---

## 9. Frontend Implementation Hints

### `lib/audio.ts` (key function)
- Use `MediaRecorder` with `mimeType: "audio/webm;codecs=opus"`
- Collect chunks in array, on stop create `Blob` and send via WebSocket

### `components/AudioPlayer.tsx`
- Use `MediaSource` API to stream MP3 chunks
- Append chunks as they arrive via WebSocket binary frames
- Auto-play

### `components/MicButton.tsx`
- Hold to record (mousedown → start, mouseup → stop)
- Or click-to-toggle for accessibility
- Show recording indicator (pulsing red dot)

### `app/page.tsx` (Persona picker)
- Two big cards side by side
- dr-tirta card: dark gradient bg, red/orange accent
- dr-ghia card: light gradient bg, soft pink/cream accent
- Each card: name, tagline, sample voice play button, "Chat" + "Call" links

### `app/chat/[persona]/page.tsx`
- Read `params.persona` to decide theme
- Show chat messages (user right, assistant left)
- Input box + send button
- Disclaimer at top
- Streaming text appears as it arrives (SSE)

### `app/call/[persona]/page.tsx`
- Big mic button (center)
- Show user transcript (real-time) + assistant response
- Auto-play TTS audio
- Show audio waveform during recording
- "Switch to text chat" link

### `lib/api.ts`
- `postChat(persona, message, history): EventSource` — for SSE
- `voiceWebSocket(persona): WebSocket` — for voice

---

## 10. docker-compose.yml

```yaml
version: "3.9"

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file: .env
    volumes:
      - ./backend/app:/app/app
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
      - NEXT_PUBLIC_WS_URL=ws://localhost:8000
    depends_on:
      - backend
    restart: unless-stopped
```

---

## 11. UI Specifications

### dr-tirta theme
```css
--bg: #0a0a0a
--bg-card: #1a1a1a
--accent: #ff3838
--accent-2: #ff8c00
--text: #f0f0f0
--text-dim: #999
--font: 'Inter', sans-serif
--border-radius: 4px
```

### dr-ghia theme
```css
--bg: #fff8f3
--bg-card: #ffffff
--accent: #d4a373
--accent-2: #faedcd
--text: #2d2d2d
--text-dim: #777
--font: 'Inter', sans-serif
--border-radius: 16px
--font-size-base: 18px  /* larger for older readers */
```

### Disclaimer (every page)
```
⚠️ Penting: Ini adalah konsultasi edukatif, BUKAN pengganti diagnosis
dokter. Untuk kondisi serius, segera periksakan langsung ke dokter
atau IGD terdekat.
```

---

## 12. Acceptance Criteria (MUST PASS)

A working prototype MUST demonstrate all of these:

1. ✅ `docker compose up --build` starts both services
2. ✅ Frontend accessible at http://localhost:3000
3. ✅ Backend health check at http://localhost:8000/health returns 200
4. ✅ Backend OpenAPI docs at http://localhost:8000/docs
5. ✅ Persona picker page works, navigates to chat/call for each
6. ✅ Text chat works for both dr-tirta and dr-ghia via SSE
7. ✅ Voice call works for both: speak → transcript → AI replies with text + cloned voice
8. ✅ Voice of dr-tirta is the cloned voice (audible difference from default)
9. ✅ Voice of dr-ghia is the cloned voice (audible difference)
10. ✅ Tone difference: tirta = blak-blakan, ghia = lembut (visible in text)
11. ✅ Disclaimer shown on every page
12. ✅ `.env.example` committed (but `.env` not committed)
13. ✅ `.gitignore` excludes `node_modules`, `.venv`, `.env`, `.next`, `__pycache__`
14. ✅ README.md in Bahasa Indonesia explains how to run

---

## 13. Build Order (RECOMMENDED)

Build in this order to fail fast and validate incrementally:

1. **Backend skeleton** — main.py + health.py + config.py, run `uvicorn`, hit `/health`
2. **STT service** — test with curl + sample WebM
3. **LLM service** — test with curl, get streaming response
4. **TTS service** — test with websockets client, save MP3, play it
5. **Voice WS endpoint** — wire it all together, test with `websocat` or `wscat`
6. **Chat REST endpoint** — test SSE with curl
7. **Frontend Next.js init** — `create-next-app`, get blank page
8. **Persona picker page** — verify navigation
9. **Chat page UI** — wire to SSE, test
10. **Call page UI** — wire to WebSocket, test
11. **Docker compose** — test full stack
12. **Polish** — themes, animations, error states
13. **README + commit + push**

---

## 14. Out of Scope (DO NOT BUILD)

- ❌ User authentication / accounts
- ❌ Persistent database (use in-memory + localStorage)
- ❌ Continuous streaming of partial LLM to TTS
- ❌ Multi-language (Indonesian only)
- ❌ Mobile native app
- ❌ Image upload (X-ray, foto luka)
- ❌ Emergency detection / escalation
- ❌ Appointment booking
- ❌ Avatar / video of the doctor

---

## 15. README.md (Bahasa Indonesia — Use this template)

```markdown
# LingoMed

Aplikasi web untuk konsultasi kesehatan edukatif dalam Bahasa Indonesia
dengan 2 persona AI: dr-tirta (gaya blak-blakan) dan dr-ghia (gaya lembut).

## ⚠️ Disclaimer Penting

Ini BUKAN layanan medis. Aplikasi ini hanya untuk edukasi kesehatan
dan TIDAK BOLEH digunakan sebagai pengganti:
- Diagnosis dari dokter
- Resep atau dosis obat
- Penanganan kondisi darurat

Untuk kondisi serius, segera periksakan langsung ke dokter atau
IGD terdekat.

## Fitur

- 💬 **Live Chat** — Tanya jawab teks dengan 2 persona AI
- 🎙️ **Live Call** — Ngobrol voice dengan AI (suara cloned asli)
- 🇮🇩 **Bahasa Indonesia** — Native, bukan terjemahan

## Cara Menjalankan

### Prasyarat
- Docker + Docker Compose
- API key: `DEEPGRAM_API_KEY`, `MINIMAX_API_KEY`

### Langkah

1. Clone repository
   ```bash
   git clone <repo-url>
   cd lingomed
   ```

2. Setup environment
   ```bash
   cp .env.example .env
   # Edit .env dan isi API key lo
   ```

3. Jalankan
   ```bash
   docker compose up --build
   ```

4. Buka browser
   - Frontend: http://localhost:3000
   - Backend API docs: http://localhost:8000/docs

## Arsitektur

[Include the data flow diagram from section 5]

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Backend:** FastAPI (Python 3.11+)
- **STT:** Deepgram Nova-3 (Indonesian)
- **LLM:** MiniMax M3 (via QuickRouter)
- **TTS:** MiniMax Speech 2.8 HD (cloned voices)

## License

MIT
```

---

## 16. .gitignore

```gitignore
# Python
__pycache__/
*.py[cod]
*.egg-info/
.venv/
venv/

# Node
node_modules/
.next/
out/

# Env
.env
.env.local

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
```

---

## 17. End

When done, push to GitHub repo specified by user. Tag commit with
`v0.1.0-mvp`.

**READY TO BUILD. 🚀**
