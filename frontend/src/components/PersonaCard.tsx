import Link from "next/link";
import type { PersonaInfo } from "@/lib/types";

interface Props {
  persona: PersonaInfo;
}

export default function PersonaCard({ persona }: Props) {
  const isTirta = persona.id === "tirta";
  return (
    <div
      className="card"
      style={{
        flex: 1,
        minWidth: 280,
        border: `2px solid ${isTirta ? "#ff3838" : "#d4a373"}`,
      }}
    >
      <div style={{ fontSize: "0.85rem", opacity: 0.7, marginBottom: 4 }}>
        {isTirta ? "🩺 Gaya Blak-blakan" : "🌸 Gaya Lembut & Empati"}
      </div>
      <h2 style={{ fontSize: "1.8rem", margin: "0 0 0.5rem 0" }}>
        {persona.name}
      </h2>
      <p style={{ fontStyle: "italic", opacity: 0.85, margin: "0 0 1rem 0" }}>
        {persona.tagline}
      </p>
      <p style={{ opacity: 0.75, marginBottom: "1.5rem" }}>
        {persona.description}
      </p>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <Link href={`/chat/${persona.id}`} className="btn btn-primary">
          💬 Chat
        </Link>
        <Link href={`/call/${persona.id}`} className="btn btn-secondary">
          🎙️ Call
        </Link>
      </div>
    </div>
  );
}
