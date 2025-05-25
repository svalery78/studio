
"use client";

import Image from 'next/image';
import { useState } from 'react';
import { cn } from "@/lib/utils";
import type { Message, AppSettings } from "@/lib/constants";
import { ChatAvatar } from "./chat-avatar";
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, StopCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatMessageProps {
  message: Message;
  appSettings?: AppSettings | null;
}

export function ChatMessage({ message, appSettings }: ChatMessageProps) {
  const isUser = message.sender === 'user';
  const alignment = isUser ? "items-end" : "items-start";
  const bubbleColor = isUser ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground";
  const bubbleAnimation = "animate-in fade-in zoom-in-95 duration-300";

  const avatarName = isUser ? appSettings?.userName : "AI";

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const { toast } = useToast();

  const handlePlayAudio = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis && message.text) {
      if (speechSynthesis.speaking && isPlayingAudio) {
        // If this message is currently speaking, stop it.
        speechSynthesis.cancel();
        setIsPlayingAudio(false);
        return;
      }

      // If any other audio is playing, cancel current speech before starting new one.
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
        // This won't reset other components' isPlayingAudio state, which is a minor visual limitation.
      }

      const utterance = new SpeechSynthesisUtterance(message.text);
      // utterance.lang could be set here if language per message was available.
      // For now, browser default will be used.

      utterance.onstart = () => {
        setIsPlayingAudio(true);
      };
      utterance.onend = () => {
        setIsPlayingAudio(false);
      };
      utterance.onerror = (event) => {
        console.error('SpeechSynthesisUtterance.onerror', event);
        setIsPlayingAudio(false);
        toast({ title: "Audio Error", description: "Could not play audio for this message.", variant: "destructive" });
      };
      speechSynthesis.speak(utterance);
    } else {
      toast({ title: "Audio Error", description: "Text-to-speech is not available or message is empty.", variant: "destructive" });
    }
  };

  return (
    <div className={cn("flex flex-col gap-2 py-3", alignment)}>
      <div className={cn("flex gap-3 items-end", isUser ? "flex-row-reverse" : "flex-row")}>
        <ChatAvatar sender={message.sender} name={avatarName} appSettings={isUser ? undefined : appSettings} />
        <Card className={cn("max-w-xs md:max-w-md lg:max-w-lg rounded-xl shadow-md", bubbleColor, bubbleAnimation)}>
          <CardContent className="p-3 break-words">
            <div className="flex items-start justify-between gap-2">
              {message.text && <p className="whitespace-pre-wrap flex-grow leading-relaxed">{message.text}</p>}
              {!isUser && message.text && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePlayAudio}
                  className="p-0 h-6 w-6 text-current opacity-60 hover:opacity-100 flex-shrink-0"
                  aria-label={isPlayingAudio ? "Stop audio" : "Play audio"}
                >
                  {isPlayingAudio ? <StopCircle className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>
              )}
            </div>
            {message.imageUrl && (
              <div className={cn("mt-2", { 'mt-0': !message.text && message.imageUrl })}>
                <Image
                  src={message.imageUrl}
                  alt={`AI Selfie`}
                  width={300}
                  height={300}
                  className="rounded-lg object-cover"
                  data-ai-hint="photorealistic woman"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <p className={cn("text-xs text-muted-foreground", isUser ? "text-right pr-14" : "text-left pl-14")}>
        {format(new Date(message.timestamp), "p")}
      </p>
    </div>
  );
}
