"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";
import ChatMessage from "@/components/ChatMessage";
import ModeToggle from "@/components/ModeToggle";
import { PERSONAS, type ChatMessage as Msg, type Persona } from "@/lib/types";
import { streamChat } from "@/lib/api";
import { loadHistory, saveHistory, clearHistory } from "@/lib/storage";

export default function ChatPage() {
  const params = useParams<{ persona: string }>();
  const personaId = (params?.persona as Persona) || "tirta";
  const persona = PERSONAS[personaId];

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages(loadHistory(personaId));
  }, [personaId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || streaming) return;
    const userMsg: Msg = { role: "user", content: input };
    const newHistory: Msg[] = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setStreaming(true);

    // placeholder assistant bubble
    const assistantIdx = newHistory.length;
    setMessages([...newHistory, { role: "assistant", content: "" }]);

    let fullReply = "";
    try {
      for await (const chunk of streamChat(personaId, userMsg.content, newHistory)) {
        fullReply += chunk;
        setMessages((prev) => {
          const copy = [...prev];
          copy[assistantIdx] = { role: "assistant", content: fullReply };
          return copy;
        });
      }
    } catch (e: any) {
      setMessages((prev) => {
        const copy = [...prev];
        copy[assistantIdx] = {
          role: "assistant",
          content: `⚠️ Error: ${e?.message || "Gagal dapat balasan"}`,
        };
        return copy;
      });
    } finally {
      setStreaming(false);
      const final: Msg[] = [...newHistory, { role: "assistant", content: fullReply }];
      saveHistory(personaId, final);
    }
  };

  const handleClear = () => {
    if (confirm("Hapus semua riwayat chat dengan " + persona.name + "?")) {
      clearHistory(personaId);
      setMessages([]);
    }
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
          <h1 style={{ margin: "0.25rem 0 0 0" }}>{persona.name}</h1>
        </div>
        <ModeToggle persona={personaId} currentMode="chat" />
      </header>

      <div style={{ maxWidth: 800, width: "100%", margin: "0 auto", padding: "1rem 1.5rem", display: "flex", flexDirection: "column", flex: 1 }}>
        <Disclaimer />

        <div className="chat-container">
          {messages.length === 0 && (
            <p style={{ opacity: 0.6, textAlign: "center", padding: "2rem" }}>
              Mulai ngobrol sama {persona.name} — ketik pesan lo di bawah.
            </p>
          )}
          {messages.map((m, i) => (
            <ChatMessage key={i} message={m} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ display: "flex", gap: "0.5rem", paddingTop: "1rem" }}>
          <input
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder={`Tanya ${persona.name}...`}
            disabled={streaming}
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-primary"
            onClick={send}
            disabled={streaming || !input.trim()}
          >
            {streaming ? "..." : "Kirim"}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleClear}
            title="Hapus riwayat"
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  );
}
