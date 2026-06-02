import Link from "next/link";
import PersonaCard from "@/components/PersonaCard";
import Disclaimer from "@/components/Disclaimer";
import { PERSONAS } from "@/lib/types";

export default function HomePage() {
  return (
    <main
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "2rem 1.5rem",
        minHeight: "100vh",
      }}
    >
      <header style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "3rem", margin: "0 0 0.5rem 0" }}>🩺 LingoMed</h1>
        <p style={{ opacity: 0.75, fontSize: "1.1rem", margin: 0 }}>
          Konsultan kesehatan edukatif dalam Bahasa Indonesia
        </p>
      </header>

      <Disclaimer />

      <section
        style={{
          display: "flex",
          gap: "1.5rem",
          flexWrap: "wrap",
          marginTop: "2rem",
        }}
      >
        <PersonaCard persona={PERSONAS.tirta} />
        <PersonaCard persona={PERSONAS.ghia} />
      </section>

      <footer
        style={{
          marginTop: "3rem",
          textAlign: "center",
          opacity: 0.6,
          fontSize: "0.85rem",
        }}
      >
        <p>Pilih persona di atas, lalu mulai chat atau call.</p>
        <p>
          🔒 API key lo gak akan dikirim ke browser. Semua proses terjadi di
          backend.
        </p>
        <p>
          <Link href="/health" style={{ textDecoration: "underline" }}>
            Cek status backend
          </Link>
        </p>
      </footer>
    </main>
  );
}
