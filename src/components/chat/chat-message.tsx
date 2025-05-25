
"use client";

import Image from 'next/image';
import { useState, useEffect } from 'react';
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
  const [preferredVoice, setPreferredVoice] = useState<SpeechSynthesisVoice | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadAndSetVoice = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const currentVoices = window.speechSynthesis.getVoices();
        if (currentVoices.length === 0) {
          return;
        }

        let selectedVoice: SpeechSynthesisVoice | null = null;

        // Priority 1: Voice selected by user during setup
        if (appSettings?.selectedVoiceName) {
          selectedVoice = currentVoices.find(voice => voice.name === appSettings.selectedVoiceName) || null;
        }

        // Fallback logic if no user-selected voice or if it's not found
        if (!selectedVoice) {
          const browserLang = navigator.language.split('-')[0].toLowerCase();
          const femaleKeywords = ['female', 'woman', 'girl', 'женский', 'девушка'];
          const knownFemaleNames = ['zira', 'samantha', 'milena', 'alena', 'alice', 'google us english', 'microsoft zira'];

          // Priority 2.1: Female keyword in name, matching browser language
          selectedVoice = currentVoices.find(voice =>
            voice.lang.toLowerCase().startsWith(browserLang) &&
            femaleKeywords.some(kw => voice.name.toLowerCase().includes(kw))
          ) || null;

          // Priority 2.2: Female keyword in name, any language
          if (!selectedVoice) {
            selectedVoice = currentVoices.find(voice =>
              femaleKeywords.some(kw => voice.name.toLowerCase().includes(kw))
            ) || null;
          }

          // Priority 2.3: Known female name, matching browser language
          if (!selectedVoice) {
            selectedVoice = currentVoices.find(voice =>
              voice.lang.toLowerCase().startsWith(browserLang) &&
              knownFemaleNames.some(name => voice.name.toLowerCase().includes(name)) &&
              !voice.name.toLowerCase().includes('male')
            ) || null;
          }

          // Priority 2.4: Known female name, any language
          if (!selectedVoice) {
            selectedVoice = currentVoices.find(voice =>
              knownFemaleNames.some(name => voice.name.toLowerCase().includes(name)) &&
              !voice.name.toLowerCase().includes('male')
            ) || null;
          }
          
          // Priority 2.5: Default voice for the language if it's female sounding
          if (!selectedVoice) {
            selectedVoice = currentVoices.find(voice =>
              voice.lang.toLowerCase().startsWith(browserLang) && voice.default && !voice.name.toLowerCase().includes('male')
            ) || null;
          }
        }
        
        // Absolute Fallback if still no voice
        if (!selectedVoice && currentVoices.length > 0) {
            const browserLang = navigator.language.split('-')[0].toLowerCase();
           selectedVoice = 
            currentVoices.find(v => v.lang.toLowerCase().startsWith(browserLang) && v.default) || 
            currentVoices.find(v => v.lang.toLowerCase().startsWith(browserLang)) || 
            currentVoices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('женский')) ||
            currentVoices.find(v => !v.name.toLowerCase().includes('male')) || 
            currentVoices[0];
        }
        setPreferredVoice(selectedVoice);
      }
    };

    if (typeof window !== 'undefined' && window.speechSynthesis) {
        if (window.speechSynthesis.getVoices().length > 0) {
            loadAndSetVoice();
        } else if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadAndSetVoice;
        } else {
            setTimeout(loadAndSetVoice, 250); 
        }
    }
    
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis ) {
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = null;
        }
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            setIsPlayingAudio(false);
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.id, appSettings?.selectedVoiceName]); // Re-run if selectedVoiceName changes

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
        // Fallback language if no preferred voice (though less likely now)
        utterance.lang = navigator.language; 
      }
      
      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
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
                  height={400}
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
