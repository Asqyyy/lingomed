import type { ChatMessage } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

/**
 * Stream chat from the backend via Server-Sent Events.
 * Yields string chunks of the assistant response.
 */
export async function* streamChat(
  persona: string,
  message: string,
  history: ChatMessage[] = []
): AsyncGenerator<string, void, void> {
  const resp = await fetch(`${API_URL}/api/${persona}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ persona, message, history }),
  });

  if (!resp.ok || !resp.body) {
    throw new Error(`Chat request failed: ${resp.status}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Parse SSE events
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      try {
        const data = JSON.parse(payload);
        if (data.chunk) yield data.chunk as string;
        if (data.done) return;
      } catch {
        // ignore parse errors
      }
    }
  }
}

/**
 * Open a WebSocket connection to the voice endpoint for a persona.
 */
export function openVoiceSocket(persona: string): WebSocket {
  return new WebSocket(`${WS_URL}/ws/${persona}`);
}

/**
 * Health check.
 */
export async function health(): Promise<{ status: string; app: string }> {
  const resp = await fetch(`${API_URL}/health`);
  return resp.json();
}
