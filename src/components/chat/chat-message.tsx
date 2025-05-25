
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
        const currentVoices = window.speechSynthesis.getVoices();
        if (currentVoices.length === 0) {
          // Voices might not be loaded yet. SpeechSynthesis.onvoiceschanged will handle it if supported.
          return;
        }

        const browserLang = navigator.language.split('-')[0].toLowerCase(); // e.g., 'en', 'ru'
        let selectedVoice: SpeechSynthesisVoice | null = null;

        const femaleKeywords = ['female', 'woman', 'girl', 'женский', 'девушка'];
        const knownFemaleNames = ['zira', 'samantha', 'milena', 'alena', 'alice', 'google us english', 'microsoft zira'];

        // Priority 1: Female keyword in name, matching browser language
        selectedVoice = currentVoices.find(voice =>
          voice.lang.toLowerCase().startsWith(browserLang) &&
          femaleKeywords.some(kw => voice.name.toLowerCase().includes(kw))
        ) || null;

        // Priority 2: Female keyword in name, any language
        if (!selectedVoice) {
          selectedVoice = currentVoices.find(voice =>
            femaleKeywords.some(kw => voice.name.toLowerCase().includes(kw))
          ) || null;
        }

        // Priority 3: Known female name, matching browser language
        if (!selectedVoice) {
          selectedVoice = currentVoices.find(voice =>
            voice.lang.toLowerCase().startsWith(browserLang) &&
            knownFemaleNames.some(name => voice.name.toLowerCase().includes(name)) &&
            !voice.name.toLowerCase().includes('male')
          ) || null;
        }

        // Priority 4: Known female name, any language
        if (!selectedVoice) {
          selectedVoice = currentVoices.find(voice =>
            knownFemaleNames.some(name => voice.name.toLowerCase().includes(name)) &&
            !voice.name.toLowerCase().includes('male')
          ) || null;
        }

        // Priority 5: Default voice for the language if it's female sounding (heuristic: not male)
        if (!selectedVoice) {
          selectedVoice = currentVoices.find(voice =>
            voice.lang.toLowerCase().startsWith(browserLang) && voice.default && !voice.name.toLowerCase().includes('male')
          ) || null;
        }
        
        // Fallback if no specific female voice found
        if (!selectedVoice && currentVoices.length > 0) {
           selectedVoice = 
            currentVoices.find(v => v.lang.toLowerCase().startsWith(browserLang) && v.default) || // Default for browser lang
            currentVoices.find(v => v.lang.toLowerCase().startsWith(browserLang)) || // Any for browser lang
            currentVoices.find(v => femaleKeywords.some(kw => v.name.toLowerCase().includes(kw))) || // Any female (backup if lang mismatch)
            currentVoices.find(v => !v.name.toLowerCase().includes('male')) || // Any non-male voice
            currentVoices[0]; // Absolute fallback
        }
        setPreferredVoice(selectedVoice);
      }
    };

    if (typeof window !== 'undefined' && window.speechSynthesis) {
        // Voices might be loaded asynchronously.
        if (window.speechSynthesis.getVoices().length > 0) {
            loadAndSetVoice();
        } else if (window.speechSynthesis.onvoiceschanged !== undefined) {
            // This is the preferred way to wait for voices
            window.speechSynthesis.onvoiceschanged = loadAndSetVoice;
        } else {
             // Fallback for browsers that don't support onvoiceschanged (e.g. older Safari)
            setTimeout(loadAndSetVoice, 250); // Try after a small delay
        }
    }
    
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis ) {
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = null;
        }
        // Stop any ongoing speech when the component unmounts or message changes
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            setIsPlayingAudio(false);
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.id]); // Re-run if the message id changes, to potentially re-evaluate voices or stop old speech

  const handlePlayAudio = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis && message.text) {
      if (speechSynthesis.speaking && isPlayingAudio) {
        speechSynthesis.cancel();
        setIsPlayingAudio(false);
        return;
      }

      if (speechSynthesis.speaking) { // If other speech is happening, cancel it.
        speechSynthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(message.text);
      
      // Attempt to set language based on browser default.
      // This is an assumption; ideally, AI would provide language of the message.
      utterance.lang = navigator.language; 

      if (preferredVoice) {
        utterance.voice = preferredVoice;
        // If preferredVoice has a specific language, it might override utterance.lang
        // or TTS engine might use it. This behavior can vary.
        // For more consistency, ensure preferredVoice.lang aligns with actual text language.
        // If preferredVoice.lang is different from utterance.lang, TTS might pick a different voice.
        if (preferredVoice.lang) {
            utterance.lang = preferredVoice.lang;
        }
      }
      
      utterance.onstart = () => {
        setIsPlayingAudio(true);
      };
      utterance.onend = () => {
        setIsPlayingAudio(false);
      };
      utterance.onerror = (event) => {
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
