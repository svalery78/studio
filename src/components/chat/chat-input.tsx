
"use client";

import { useState, type FormEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Image as ImageIcon, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ChatInputProps {
  onSendMessage: (messageText: string) => void;
  onSelfieRequest: () => void;
  isSending: boolean;
  inputDisabled?: boolean; // Prop to specifically disable the text input
  selfieDisabled?: boolean; // Prop to specifically disable the selfie button
}

export function ChatInput({ 
  onSendMessage, 
  onSelfieRequest, 
  isSending,
  inputDisabled = false, // Default to false (enabled)
  selfieDisabled = false, // Default to false (enabled)
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isSending && !inputDisabled) {
      onSendMessage(inputValue.trim());
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="sticky bottom-0 left-0 right-0 p-4 bg-background border-t border-border shadow- ऊपर"
    >
      <div className="flex items-center gap-2">
        <Textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={inputDisabled ? "Please respond to the setup questions..." : "Type your message..."}
          className="flex-1 resize-none min-h-[40px] max-h-[120px] rounded-full px-4 py-2 shadow-sm focus-visible:ring-1 focus-visible:ring-ring"
          rows={1}
          disabled={isSending || inputDisabled}
        />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                onClick={onSelfieRequest} 
                disabled={isSending || selfieDisabled} 
                className="text-muted-foreground hover:text-accent-foreground"
              >
                <ImageIcon className="h-5 w-5" />
                <span className="sr-only">Request Selfie</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Request a selfie</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button 
          type="submit" 
          variant="default" 
          size="icon" 
          disabled={isSending || inputDisabled || !inputValue.trim()} 
          className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full"
        >
          {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          <span className="sr-only">Send message</span>
        </Button>
      </div>
    </form>
  );
}
