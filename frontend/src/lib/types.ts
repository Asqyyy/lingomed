export type Persona = "tirta" | "ghia";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PersonaInfo {
  id: Persona;
  name: string;
  tagline: string;
  description: string;
  themeClass: string;
}

export const PERSONAS: Record<Persona, PersonaInfo> = {
  tirta: {
    id: "tirta",
    name: "dr-tirta",
    tagline: "Blak-blakan, gak pake basa-basi",
    description:
      "Konsultan kesehatan dengan gaya langsung, to-the-point, dan berani bilang kebenaran walau pedas.",
    themeClass: "theme-tirta",
  },
  ghia: {
    id: "ghia",
    name: "dr-ghia",
    tagline: "Lembut, sabar, penuh empati",
    description:
      "Konsultan kesehatan keluarga yang hangat, validatif, dan menenangkan — kayak curhat ke teman.",
    themeClass: "theme-ghia",
  },
};
