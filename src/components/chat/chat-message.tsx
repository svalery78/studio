
"use client";

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import type { Message, AppSettings } from "@/lib/constants";
import { ChatAvatar } from "./chat-avatar";
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, StopCircle } from 'lucide-react'; // Changed icons
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
  const [preferredVoice, setPreferredVoice] = useState<SpeechSynthesisVoice | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadAndSetVoice = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) {
          // Voices might not be loaded yet.
          return;
        }

        const browserLang = navigator.language.split('-')[0].toLowerCase(); // e.g., 'en', 'ru'
        let bestMatch: SpeechSynthesisVoice | null = null;

        const femaleKeywords = ['female', 'woman', 'girl', 'женский', 'девушка'];
        const knownFemaleNames = ['zira', 'samantha', 'milena', 'alena', 'alice', 'google us english', 'microsoft zira']; // Add more known good names

        // Priority 1: Female keyword in name, matching browser language
        bestMatch = voices.find(voice => 
          voice.lang.toLowerCase().startsWith(browserLang) &&
          femaleKeywords.some(kw => voice.name.toLowerCase().includes(kw))
        ) || bestMatch;

        // Priority 2: Female keyword in name, any language
        if (!bestMatch) {
          bestMatch = voices.find(voice => 
            femaleKeywords.some(kw => voice.name.toLowerCase().includes(kw))
          ) || bestMatch;
        }
        
        // Priority 3: Known female name, matching browser language
        if (!bestMatch) {
           bestMatch = voices.find(voice =>
            voice.lang.toLowerCase().startsWith(browserLang) &&
            knownFemaleNames.some(name => voice.name.toLowerCase().includes(name)) &&
            !voice.name.toLowerCase().includes('male') // Avoid male voices with similar names
          ) || bestMatch;
        }

        // Priority 4: Known female name, any language
        if (!bestMatch) {
          bestMatch = voices.find(voice =>
            knownFemaleNames.some(name => voice.name.toLowerCase().includes(name)) &&
            !voice.name.toLowerCase().includes('male') 
          ) || bestMatch;
        }
        
        // Priority 5: Default voice for the language if it's female sounding (heuristic: not male)
        if (!bestMatch) {
            bestMatch = voices.find(voice => voice.lang.toLowerCase().startsWith(browserLang) && voice.default && !voice.name.toLowerCase().includes('male')) || bestMatch;
        }


        if (bestMatch) {
          setPreferredVoice(bestMatch);
        } else if (voices.length > 0) {
          // Fallback to the first available voice if no better match is found and it's not obviously male
          const firstFallback = voices.find(v => !v.name.toLowerCase().includes('male'));
          setPreferredVoice(firstFallback || voices[0]);
        }
      }
    };

    if (typeof window !== 'undefined' && window.speechSynthesis) {
        // Voices might be loaded asynchronously.
        if (window.speechSynthesis.getVoices().length > 0) {
            loadAndSetVoice();
        } else if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadAndSetVoice;
        } else {
             // For browsers that don't support onvoiceschanged, try after a small delay
            setTimeout(loadAndSetVoice, 100);
        }
    }
    
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = null;
      }
      // Stop any ongoing speech when the component unmounts or message changes
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setIsPlayingAudio(false);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.id]); // Re-run if the message id changes, in case voices load late for a specific message

  const handlePlayAudio = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis && message.text) {
      if (speechSynthesis.speaking && isPlayingAudio) {
        speechSynthesis.cancel();
        setIsPlayingAudio(false);
        return;
      }

      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(message.text);
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
        utterance.lang = preferredVoice.lang; // Use the language of the selected voice
      } else {
         // Attempt to set language based on browser default if no preferred voice
         utterance.lang = navigator.language;
      }
      // You could also try to determine language from message.text if it's multilingual
      // For example, by passing language info with the message object from the backend.

      utterance.onstart = () => {
        setIsPlayingAudio(true);
      };
      utterance.onend = () => {
        setIsPlayingAudio(false);
      };
      utterance.onerror = (event) => {
        // console.error('SpeechSynthesisUtterance.onerror', event); // Removed this line
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
                  height={400} // Assuming a portrait aspect ratio for selfies
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
