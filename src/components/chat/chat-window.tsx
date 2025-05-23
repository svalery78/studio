"use client";

import type { Message, AppSettings } from "@/lib/constants";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (messageText: string) => void;
  onSelfieRequest: () => void;
  isSendingMessage: boolean;
  appSettings: AppSettings | null;
}

export function ChatWindow({
  messages,
  onSendMessage,
  onSelfieRequest,
  isSendingMessage,
  appSettings,
}: ChatWindowProps) {
  const scrollRef = useChatScroll(messages);

  return (
    <div className="flex flex-col h-full bg-card shadow-lg rounded-lg overflow-hidden">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} userName={appSettings?.userName} />
          ))}
          {isSendingMessage && messages[messages.length-1]?.sender === 'user' && (
             <ChatMessage 
              message={{ 
                id: 'typing-indicator', 
                sender: 'ai', 
                text: 'Typing...', 
                timestamp: Date.now() 
              }} 
            />
          )}
        </div>
      </ScrollArea>
      <ChatInput
        onSendMessage={onSendMessage}
        onSelfieRequest={onSelfieRequest}
        isSending={isSendingMessage}
      />
    </div>
  );
}
