
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceSelectorProps {
  availableVoices: SpeechSynthesisVoice[];
  onVoiceSelected: (voiceName: string | null) => void;
  isProcessing: boolean;
  currentSelectedVoiceName: string | null;
}

export function VoiceSelector({
  availableVoices,
  onVoiceSelected,
  isProcessing,
  currentSelectedVoiceName,
}: VoiceSelectorProps) {
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<number | null>(null);
  const [isPreviewing, setIsPreviewing] = useState<string | null>(null);
  const { toast } = useToast();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    if (currentSelectedVoiceName && availableVoices.length > 0) {
      const currentIndex = availableVoices.findIndex(v => v.name === currentSelectedVoiceName);
      if (currentIndex !== -1) {
        setSelectedVoiceIndex(currentIndex);
      } else {
        setSelectedVoiceIndex(null);
      }
    } else {
      setSelectedVoiceIndex(null);
    }
  }, [currentSelectedVoiceName, availableVoices, hasMounted]);


  const handlePreviewVoice = (voice: SpeechSynthesisVoice) => {
    if (!hasMounted || typeof window === 'undefined' || !window.speechSynthesis) return;

    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      if (isPreviewing === voice.name) {
        setIsPreviewing(null);
        return;
      }
    }
    
    setIsPreviewing(voice.name);
    const utterance = new SpeechSynthesisUtterance("Hello, this is a preview of my voice.");
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.onend = () => setIsPreviewing(null);
    utterance.onerror = () => {
      setIsPreviewing(null);
      toast({ title: "Preview Error", description: "Could not play voice preview.", variant: "destructive" });
    };
    speechSynthesis.speak(utterance);
  };

  const handleConfirm = () => {
    if (!hasMounted) return;
    if (selectedVoiceIndex !== null && availableVoices[selectedVoiceIndex]) {
      onVoiceSelected(availableVoices[selectedVoiceIndex].name);
    } else {
      onVoiceSelected(null); 
    }
  };

  const handleSelectDefault = () => {
    if (!hasMounted) return;
    setSelectedVoiceIndex(null); 
    onVoiceSelected(null); 
  };

  const handleRadioValueChange = (value: string) => {
    if (!hasMounted) return;
    const newIndex = parseInt(value, 10);
    if (!isNaN(newIndex) && newIndex >= 0 && newIndex < availableVoices.length) {
      setSelectedVoiceIndex(newIndex);
    } else {
      setSelectedVoiceIndex(null);
    }
  };

  if (!hasMounted) {
    // Render a minimal placeholder or null on the server and initial client render
    return (
         <Card className="w-full max-w-lg mx-auto my-auto shadow-xl">
            <CardHeader>
            <CardTitle>Choose My Voice</CardTitle>
            <CardDescription>Loading available voices...</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-10">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </CardContent>
        </Card>
    );
  }

  if (availableVoices.length === 0 && !isProcessing) {
    return (
      <Card className="w-full max-w-lg mx-auto my-auto shadow-xl">
        <CardHeader>
          <CardTitle>Choose My Voice</CardTitle>
          <CardDescription>Loading available voices or no voices found...</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto my-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Choose My Voice</CardTitle>
        <CardDescription>
          Select a voice you'd like me to use. You can preview each one.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[50vh] overflow-y-auto p-4">
        <RadioGroup
          value={selectedVoiceIndex !== null ? selectedVoiceIndex.toString() : undefined}
          onValueChange={handleRadioValueChange}
        >
          {availableVoices.map((voice, index) => {
            const uniqueItemId = `voice-option-${index}`;
            const voiceDisplayName = (typeof voice.name === 'string' && voice.name.trim() !== '') ? voice.name : `Voice ${index + 1}`;
            
            return (
              <div key={index} className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value={index.toString()} id={uniqueItemId} disabled={isProcessing} />
                  <Label htmlFor={uniqueItemId} className="cursor-pointer">
                    {voiceDisplayName} ({voice.lang}) {voice.default ? "[Default]" : ""}
                  </Label>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handlePreviewVoice(voice)}
                  disabled={isProcessing || (typeof window !== 'undefined' && window.speechSynthesis?.speaking && isPreviewing !== voice.name)}
                  aria-label={`Preview voice ${voiceDisplayName}`}
                  className="h-8 w-8"
                >
                  {isPreviewing === voice.name ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              </div>
            );
          })}
        </RadioGroup>
        {availableVoices.length === 0 && isProcessing && (
             <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-2 text-muted-foreground">Loading voices...</p>
            </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between gap-2 pt-6">
        <Button variant="outline" onClick={handleSelectDefault} disabled={isProcessing}>
          Use Default Voice
        </Button>
        <Button onClick={handleConfirm} disabled={isProcessing || selectedVoiceIndex === null}>
          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Confirm Selection
        </Button>
      </CardFooter>
    </Card>
  );
}
