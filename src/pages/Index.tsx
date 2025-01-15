import { useState, useEffect } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { ChatSidebar } from "@/components/ChatSidebar";
import { TypingIndicator } from "@/components/TypingIndicator";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { getChatHistory } from "@/services/chatService";
import { useToast } from "@/hooks/use-toast";

interface Source {
  document: string;
  page: number;
  paragraph: number;
  text: string;
  metadata: {
    size: number;
    last_modified: string;
    file_type: string;
  };
}

interface Message {
  content: string;
  isUser: boolean;
  sources?: Source[];
  userId?: string;
  runId?: string;
  pdfPath?: string | null;
  sessionId?: string;
  messageId?: string;  // Add messageId to the interface
}

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    { 
      content: "This demo version provides an early showcase of the Brown & Brown Support Desk Agent. Please note the following:\n\n" +
               "• You can ask questions regarding Acturis user guides.\n" +
               "• View the responses generated by the AI agent.\n" +
               "• A file download feature is available for PDF documents containing the source of information.\n\n" +
               "Important: In this demo, some functionalities are disabled.", 
      isUser: false,
      messageId: 'welcome-message'  // Add a messageId for the welcome message
    },
  ]);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
      }
    });
  }, []);

  const parseSourcesFromContent = (content: string): Source[] => {
    const sourcesMatch = content.match(/<sources>(.*?)<\/sources>/s);
    if (!sourcesMatch) return [];

    const sourceContent = sourcesMatch[1];
    const source: Source = {
      document: (sourceContent.match(/<document>(.*?)<\/document>/) || [])[1] || '',
      page: parseInt((sourceContent.match(/<page>(\d+)<\/page>/) || [])[1] || '0'),
      paragraph: parseInt((sourceContent.match(/<paragraph>(\d+)<\/paragraph>/) || [])[1] || '0'),
      text: (sourceContent.match(/<text>(.*?)<\/text>/s) || [])[1] || '',
      metadata: {
        size: 0,
        last_modified: '',
        file_type: ''
      }
    };

    return [source];
  };

  const handleChatSelect = async (sessionId: string) => {
    if (!userId) return;
    
    console.log('Loading chat history for session:', sessionId);
    setSelectedChat(sessionId);
    
    try {
      const history = await getChatHistory(sessionId, userId);
      console.log('Received chat history:', history);
      
      const formattedMessages: Message[] = history.map((msg, index) => {
        console.log('Formatting message:', msg);
        let sources = msg.sources;
        
        if ((!sources || !sources.length) && msg.role === 'assistant') {
          sources = parseSourcesFromContent(msg.content);
          if (sources.length > 0) {
            msg.content = msg.content.replace(/<sources>.*?<\/sources>/s, '').trim();
          }
        }

        return {
          content: msg.content,
          isUser: msg.role === 'user',
          sources: sources || [],
          userId: userId,
          runId: sessionId,
          pdfPath: msg.pdf_path || null,
          sessionId: sessionId,
          messageId: `${sessionId}-${index}`  // Generate a unique messageId for each message
        };
      });
      
      console.log('Formatted messages:', formattedMessages);
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading chat history:', error);
      toast({
        title: "Error",
        description: "Failed to load chat history",
        variant: "destructive",
      });
    }
  };

  const handleUserMessage = (userMessage: string) => {
    if (!userId) return;
    setMessages(prev => [...prev, { 
      content: userMessage, 
      isUser: true,
      messageId: `${selectedChat}-${Date.now()}-user`,  // Add unique messageId
      sessionId: selectedChat || undefined
    }]);
  };

  const handleAIResponse = (
    apiResponse: string, 
    sources: Source[] = [], 
    runId: string, 
    pdfPath: string | null = null
  ) => {
    if (!userId) return;
    console.log('Handling AI response:', { apiResponse, sources, runId, pdfPath });
    setMessages(prev => [
      ...prev,
      { 
        content: apiResponse, 
        isUser: false, 
        sources, 
        userId, 
        runId,
        pdfPath,
        sessionId: selectedChat || undefined,
        messageId: `${runId}-${Date.now()}-ai`  // Add unique messageId
      }
    ]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-background">
      <ChatSidebar 
        onChatSelect={handleChatSelect}
        selectedChat={selectedChat || undefined}
      />
      
      <div className="flex-1 flex flex-col">
        <header className="flex justify-between items-center p-4 border-b border-border bg-card">
          <h1 className="text-2xl font-semibold">Brown & Brown Support Desk Agent</h1>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-destructive gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </header>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((message, index) => {
            // Add debug log for each message's props
            console.log(`Rendering message ${index}:`, {
              isUser: message.isUser,
              userId: message.userId,
              sessionId: message.sessionId,
              messageId: message.messageId,
              hasContent: Boolean(message.content)
            });
            
            return (
              <ChatMessage 
                key={message.messageId || index}
                {...message}
                userId={userId || undefined}
                previousMessage={index > 0 ? messages[index - 1].content : undefined}
              />
            );
          })}
          {isTyping && <TypingIndicator />}
        </div>
        
        <ChatInput 
          onSendMessage={handleUserMessage}
          onResponse={handleAIResponse}
          setIsTyping={setIsTyping}
        />
      </div>
    </div>
  );
};

export default Index;