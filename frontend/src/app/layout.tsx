import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "LingoMed — Konsultan Kesehatan Edukatif",
  description: "Konsultasi kesehatan edukatif dalam Bahasa Indonesia dengan 2 persona AI.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
