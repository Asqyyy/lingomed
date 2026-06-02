"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";
import ModeToggle from "@/components/ModeToggle";
import MicButton from "@/components/MicButton";
import AudioPlayer from "@/components/AudioPlayer";
import { PERSONAS, type Persona } from "@/lib/types";
import { openVoiceSocket } from "@/lib/api";
import type { StreamingMp3Player } from "@/lib/audio";

interface Turn {
  user: string;
  assistant: string;
}

export default function CallPage() {
  const params = useParams<{ persona: string }>();
  const personaId = (params?.persona as Persona) || "tirta";
  const persona = PERSONAS[personaId];

  const [turns, setTurns] = useState<Turn[]>([]);
  const [currentUserText, setCurrentUserText] = useState("");
  const [currentAssistantText, setCurrentAssistantText] = useState("");
  const [status, setStatus] = useState<"idle" | "connecting" | "ready" | "processing" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const playerRef = useRef<StreamingMp3Player | null>(null);
  const assistantTextRef = useRef("");
  const currentUserTextRef = useRef("");

  useEffect(() => {
    currentUserTextRef.current = currentUserText;
  }, [currentUserText]);

  useEffect(() => {
    setStatus("connecting");
    const ws = openVoiceSocket(personaId);
    wsRef.current = ws;

    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      setStatus("ready");
      setErrorMsg(null);
    };

    ws.onerror = () => {
      setStatus("error");
      setErrorMsg("Gagal konek ke server voice. Cek backend & .env.");
    };

    ws.onclose = () => {
      setStatus("idle");
    };

    ws.onmessage = (ev) => {
      if (ev.data instanceof ArrayBuffer) {
        // MP3 chunk
        if (playerRef.current) {
          playerRef.current.append(ev.data);
        }
        return;
      }
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "transcript") {
          if (msg.is_final && msg.text) {
            setCurrentUserText(msg.text);
            assistantTextRef.current = "";
            setCurrentAssistantText("");
          }
        } else if (msg.type === "llm_chunk") {
          assistantTextRef.current += msg.text;
          setCurrentAssistantText(assistantTextRef.current);
        } else if (msg.type === "done") {
          setTurns((prev) => [
            ...prev,
            { user: currentUserTextRef.current, assistant: msg.text || assistantTextRef.current },
          ]);
          setCurrentUserText("");
          setCurrentAssistantText("");
          assistantTextRef.current = "";
          setStatus("ready");
        } else if (msg.type === "error") {
          setErrorMsg(`[${msg.stage}] ${msg.detail}`);
          setStatus("ready");
        }
      } catch (e) {
        // ignore
      }
    };

    return () => {
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personaId]);

  const onAudioReady = (blob: Blob) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setErrorMsg("Belum terkoneksi ke server.");
      return;
    }
    setStatus("processing");
    setErrorMsg(null);
    blob.arrayBuffer().then((buf) => {
      wsRef.current!.send(buf);
    });
  };

  return (
    <div className={persona.themeClass} style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          padding: "1rem 1.5rem",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div>
          <Link href="/" style={{ opacity: 0.7, fontSize: "0.9rem" }}>
            ← Kembali
          </Link>
          <h1 style={{ margin: "0.25rem 0 0 0" }}>
            🎙️ Call {persona.name}
          </h1>
        </div>
        <ModeToggle persona={personaId} currentMode="call" />
      </header>

      <div style={{ maxWidth: 800, width: "100%", margin: "0 auto", padding: "1rem 1.5rem", display: "flex", flexDirection: "column", flex: 1, gap: "1rem" }}>
        <Disclaimer />

        <div style={{ opacity: 0.75, fontSize: "0.9rem" }}>
          Status:{" "}
          <strong>
            {status === "idle" && "—"}
            {status === "connecting" && "⏳ Menghubungkan..."}
            {status === "ready" && "✅ Siap"}
            {status === "processing" && "🔄 Memproses..."}
            {status === "error" && "❌ Error"}
          </strong>
        </div>

        {errorMsg && (
          <div className="disclaimer" style={{ background: "rgba(255,0,0,0.15)", borderColor: "rgba(255,0,0,0.5)" }}>
            {errorMsg}
          </div>
        )}

        <div
          style={{
            flex: 1,
            background: "var(--bg-card)",
            borderRadius: "var(--radius)",
            padding: "1rem",
            overflowY: "auto",
            minHeight: 200,
          }}
        >
          {turns.length === 0 && !currentUserText && (
            <p style={{ opacity: 0.6, textAlign: "center", padding: "2rem" }}>
              Tahan tombol mikrofon, ngomong, lepas — dengerin balasan.
            </p>
          )}
          {turns.map((t, i) => (
            <div key={i} style={{ marginBottom: "1rem" }}>
              <div className="chat-bubble chat-user">{t.user}</div>
              <div className="chat-bubble chat-assistant" style={{ whiteSpace: "pre-wrap" }}>
                {t.assistant}
              </div>
            </div>
          ))}
          {currentUserText && (
            <div className="chat-bubble chat-user">{currentUserText}</div>
          )}
          {currentAssistantText && (
            <div className="chat-bubble chat-assistant" style={{ whiteSpace: "pre-wrap" }}>
              {currentAssistantText}
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", padding: "1rem 0" }}>
          <MicButton
            onAudioReady={onAudioReady}
            disabled={status === "connecting" || status === "processing"}
            persona={persona.name}
          />
        </div>

        <AudioPlayer onReady={(p) => (playerRef.current = p)} />
      </div>
    </div>
  );
}
