import Link from "next/link";
import type { Persona } from "@/lib/types";

interface Props {
  persona: Persona;
  currentMode: "chat" | "call";
}

export default function ModeToggle({ persona, currentMode }: Props) {
  return (
    <div style={{ display: "flex", gap: "0.5rem" }}>
      <Link
        href={`/chat/${persona}`}
        className={`btn ${currentMode === "chat" ? "btn-primary" : "btn-secondary"}`}
        style={{ padding: "0.5rem 1rem", fontSize: "0.9rem" }}
      >
        💬 Chat
      </Link>
      <Link
        href={`/call/${persona}`}
        className={`btn ${currentMode === "call" ? "btn-primary" : "btn-secondary"}`}
        style={{ padding: "0.5rem 1rem", fontSize: "0.9rem" }}
      >
        🎙️ Call
      </Link>
    </div>
  );
}
