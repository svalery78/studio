
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Volume2 } from 'lucide-react'; // Removed Play, kept Volume2 for preview
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
  const [selectedVoiceNameInternal, setSelectedVoiceNameInternal] = useState<string | undefined>(
    currentSelectedVoiceName ?? undefined
  );
  const [isPreviewing, setIsPreviewing] = useState<string | null>(null); // Stores name of voice being previewed
  const { toast } = useToast();

  useEffect(() => {
    // Sync internal state if the prop changes
    setSelectedVoiceNameInternal(currentSelectedVoiceName ?? undefined);
  }, [currentSelectedVoiceName]);


  const handlePreviewVoice = (voice: SpeechSynthesisVoice) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
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
    }
  };

  const handleConfirm = () => {
    // selectedVoiceNameInternal will be either a string (name) or undefined
    onVoiceSelected(selectedVoiceNameInternal || null);
  };

  const handleSelectDefault = () => {
    setSelectedVoiceNameInternal(undefined); // Visually unselect any specific voice
    onVoiceSelected(null); // Inform parent to use default
  };


  if (availableVoices.length === 0 && !isProcessing) { // Added !isProcessing to avoid flicker if voices load fast
    return (
      <Card className="w-full max-w-md mx-auto my-auto shadow-xl">
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

  return (
    <Card className="w-full max-w-lg mx-auto my-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Choose My Voice</CardTitle>
        <CardDescription>
          Select a voice you'd like me to use. You can preview each one.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[50vh] overflow-y-auto p-4">
        <RadioGroup value={selectedVoiceNameInternal} onValueChange={setSelectedVoiceNameInternal}>
          {availableVoices.map((voice) => (
            <div key={voice.name} className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50">
              <div className="flex items-center space-x-3">
                <RadioGroupItem value={voice.name} id={voice.name} disabled={isProcessing} />
                <Label htmlFor={voice.name} className="cursor-pointer">
                  {voice.name} ({voice.lang}) {voice.default ? "[Default]" : ""}
                </Label>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handlePreviewVoice(voice)}
                disabled={isProcessing || (speechSynthesis.speaking && isPreviewing !== voice.name)}
                aria-label={`Preview voice ${voice.name}`}
                className="h-8 w-8"
              >
                {isPreviewing === voice.name ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            </div>
          ))}
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
        <Button onClick={handleConfirm} disabled={isProcessing || selectedVoiceNameInternal === undefined}>
          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Confirm Selection
        </Button>
      </CardFooter>
    </Card>
  );
}
