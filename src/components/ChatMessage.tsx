import { cn } from "@/lib/utils";

interface ChatMessageProps {
  content: string;
  isUser: boolean;
}

export const ChatMessage = ({ content, isUser }: ChatMessageProps) => {
  return (
    <div className={cn(
      "chat-bubble whitespace-pre-wrap", 
      isUser ? "user-message" : "agent-message"
    )}>
      {content}
    </div>
  );
};