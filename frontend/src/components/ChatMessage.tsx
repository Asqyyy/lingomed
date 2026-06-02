import type { ChatMessage as Msg } from "@/lib/types";

interface Props {
  message: Msg;
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";
  return (
    <div
      className={`chat-bubble ${isUser ? "chat-user" : "chat-assistant"}`}
      style={{ whiteSpace: "pre-wrap" }}
    >
      {message.content}
    </div>
  );
}
