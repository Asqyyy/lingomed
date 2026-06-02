"use client";

import { useState } from "react";
import { startRecording, stopRecording } from "@/lib/audio";

interface Props {
  onAudioReady: (blob: Blob) => void;
  disabled?: boolean;
  persona: string;
}

export default function MicButton({ onAudioReady, disabled, persona }: Props) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    if (disabled) return;
    setError(null);
    try {
      await startRecording();
      setRecording(true);
    } catch (e: any) {
      setError(e?.message || "Gagal akses mikrofon");
    }
  };

  const handleStop = async () => {
    if (!recording) return;
    try {
      const blob = await stopRecording();
      setRecording(false);
      onAudioReady(blob);
    } catch (e: any) {
      setError(e?.message || "Gagal stop recording");
      setRecording(false);
    }
  };

  return (
    <div style={{ textAlign: "center" }}>
      <button
        type="button"
        className={`mic-button ${recording ? "recording" : ""}`}
        onMouseDown={handleStart}
        onMouseUp={handleStop}
        onMouseLeave={handleStop}
        onTouchStart={handleStart}
        onTouchEnd={handleStop}
        disabled={disabled}
        aria-label="Hold to record"
      >
        {recording ? "⏹" : "🎙️"}
      </button>
      <p style={{ marginTop: "1rem", opacity: 0.75 }}>
        {recording ? "Lagi merekam... lepas untuk kirim" : `Tahan untuk ngomong ke ${persona}`}
      </p>
      {error && (
        <p style={{ color: "#ff8888", marginTop: "0.5rem" }}>{error}</p>
      )}
    </div>
  );
}
