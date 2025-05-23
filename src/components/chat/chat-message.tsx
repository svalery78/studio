"use client";

import Image from 'next/image';
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/constants";
import { ChatAvatar } from "./chat-avatar";
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';

interface ChatMessageProps {
  message: Message;
  userName?: string;
}

export function ChatMessage({ message, userName }: ChatMessageProps) {
  const isUser = message.sender === 'user';
  const alignment = isUser ? "items-end" : "items-start";
  const bubbleColor = isUser ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground";
  const bubbleAnimation = "animate-in fade-in zoom-in-95 duration-300";

  return (
    <div className={cn("flex flex-col gap-2 py-3", alignment)}>
      <div className={cn("flex gap-3 items-end", isUser ? "flex-row-reverse" : "flex-row")}>
        <ChatAvatar sender={message.sender} name={isUser ? userName : "AI"} />
        <Card className={cn("max-w-xs md:max-w-md lg:max-w-lg rounded-xl shadow-md", bubbleColor, bubbleAnimation)}>
          <CardContent className="p-3 break-words">
            {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
            {message.imageUrl && (
              <div className="mt-2">
                <p className="text-sm italic mb-1">Here's a selfie for you ({message.style || 'default'} style):</p>
                <Image
                  src={message.imageUrl}
                  alt="AI Selfie"
                  width={300}
                  height={300}
                  className="rounded-lg object-cover"
                  data-ai-hint="portrait model"
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
