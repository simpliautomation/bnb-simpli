import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SendHorizontal } from "lucide-react";
import { useState, useEffect } from "react";
import { sendChatMessage } from "@/services/chatService";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ChatInputProps {
  onSendMessage: (message: string, response: string) => void;
}

export const ChatInput = ({ onSendMessage }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Get the current user's ID when component mounts
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !userId) return;

    setIsLoading(true);
    try {
      const runId = crypto.randomUUID(); // Generate a unique session ID
      const response = await sendChatMessage(message, userId, runId);
      onSendMessage(message, response.response);
      setMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t border-border">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Enter Text"
        className="flex-1 bg-muted"
        disabled={isLoading || !userId}
      />
      <Button type="submit" size="icon" disabled={isLoading || !userId}>
        <SendHorizontal className="h-4 w-4" />
      </Button>
    </form>
  );
};