import type { ChatMessage, Persona } from "./types";

const KEY = (persona: Persona) => `lingomed:history:${persona}`;

export function loadHistory(persona: Persona): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY(persona));
    if (!raw) return [];
    return JSON.parse(raw) as ChatMessage[];
  } catch {
    return [];
  }
}

export function saveHistory(persona: Persona, history: ChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    // keep last 50 messages to avoid localStorage bloat
    const trimmed = history.slice(-50);
    localStorage.setItem(KEY(persona), JSON.stringify(trimmed));
  } catch {
    // ignore quota errors
  }
}

export function clearHistory(persona: Persona) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY(persona));
}
