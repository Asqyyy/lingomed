# LingoMed

Aplikasi web untuk konsultasi kesehatan edukatif dalam Bahasa Indonesia
dengan 2 persona AI: **dr-tirta** (gaya blak-blakan) dan **dr-ghia** (gaya lembut).

## ⚠️ Disclaimer Penting

Ini **BUKAN** layanan medis. Aplikasi ini hanya untuk edukasi kesehatan
dan **TIDAK BOLEH** digunakan sebagai pengganti:
- Diagnosis dari dokter
- Resep atau dosis obat
- Penanganan kondisi darurat

Untuk kondisi serius, segera periksakan langsung ke dokter atau
IGD terdekat.

## Fitur

- 💬 **Live Chat** — Tanya jawab teks dengan 2 persona AI (streaming via SSE)
- 🎙️ **Live Call** — Ngobrol voice dengan AI (suara cloned asli via WebSocket)
- 🇮🇩 **Bahasa Indonesia** — Native, bukan terjemahan
- 🎨 **Dual Theme** — dr-tirta (dark, red/orange) vs dr-ghia (light, soft pastel)

## Cara Menjalankan

### Prasyarat

- Docker + Docker Compose, **atau**
- Python 3.11+ dan Node 20+ (untuk run manual)
- API key: `DEEPGRAM_API_KEY`, `MINIMAX_API_KEY`

### Dengan Docker (recommended)

```bash
git clone https://github.com/Asqyyy/lingomed.git
cd lingomed
cp .env.example .env
# Edit .env dan isi API key lo
docker compose up --build
```

Buka:
- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

### Manual (tanpa Docker)

**Backend:**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# edit .env
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 \
NEXT_PUBLIC_WS_URL=ws://localhost:8000 \
  npm run dev
```

## Arsitektur

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

Text chat menggunakan SSE (Server-Sent Events) di endpoint
`POST /api/{persona}/chat` (dibalik proxy rewrite Next.js).

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Backend:** FastAPI (Python 3.11+), Uvicorn, httpx, websockets
- **STT:** Deepgram Nova-3 (Indonesian, `language=id`)
- **LLM:** MiniMax M3 (OpenAI-compatible API)
- **TTS:** MiniMax Speech 2.8 HD (cloned voices)

## Personas

### dr-tirta
- Gaya: blak-blakan, ngegas, to-the-point
- Voice ID: `moss_audio_a7606e3d-5e89-11f1-b3de-deb486b97a4e`
- Theme: dark dengan aksen merah/oranye

### dr-ghia
- Gaya: lembut, sabar, penuh empati
- Voice ID: `moss_audio_46569d25-5e90-11f1-adb2-f26303c3c234`
- Theme: light dengan pastel cream/pink

## API Endpoints

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET    | `/health` | Health check |
| GET    | `/docs`   | OpenAPI / Swagger UI |
| POST   | `/api/{persona}/chat` | Streaming chat (SSE) |
| WS     | `/ws/{persona}` | Voice call (audio bytes in, MP3 bytes out + JSON events) |

`persona` = `tirta` | `ghia`

## Environment Variables

Lihat `.env.example`. Wajib diisi:
- `DEEPGRAM_API_KEY` — STT
- `MINIMAX_API_KEY` — LLM + TTS
- `DR_TIRTA_VOICE_ID` & `DR_GHIA_VOICE_ID` — cloned voice IDs (sudah
  disediakan di `.env.example`)

## License

MIT
