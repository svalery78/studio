
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Play, Volume2 } from 'lucide-react';
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
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | undefined>(
    availableVoices.find(v => v.name === currentSelectedVoiceName)?.voiceURI
  );
  const [isPreviewing, setIsPreviewing] = useState<string | null>(null); // Stores URI of voice being previewed
  const { toast } = useToast();

  useEffect(() => {
    // Update selectedVoiceURI if currentSelectedVoiceName changes from props
    // and a matching voice is found. This keeps the radio button in sync
    // if the parent component re-renders with a new pre-selected voice.
    const matchingVoice = availableVoices.find(v => v.name === currentSelectedVoiceName);
    if (matchingVoice) {
      setSelectedVoiceURI(matchingVoice.voiceURI);
    } else if (currentSelectedVoiceName === null) {
      // If parent explicitly wants no voice selected (default)
      setSelectedVoiceURI(undefined);
    }
  }, [currentSelectedVoiceName, availableVoices]);


  const handlePreviewVoice = (voice: SpeechSynthesisVoice) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel(); // Stop any current speech
        if (isPreviewing === voice.voiceURI) { // If clicking the same preview button again
          setIsPreviewing(null);
          return;
        }
      }
      
      setIsPreviewing(voice.voiceURI);
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
    if (selectedVoiceURI) {
      const voice = availableVoices.find(v => v.voiceURI === selectedVoiceURI);
      onVoiceSelected(voice ? voice.name : null);
    } else {
      onVoiceSelected(null); // User wants default
    }
  };

  const handleSelectDefault = () => {
    setSelectedVoiceURI(undefined); // Visually unselect any specific voice
    onVoiceSelected(null); // Inform parent to use default
  };


  if (availableVoices.length === 0) {
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
        <RadioGroup value={selectedVoiceURI} onValueChange={setSelectedVoiceURI}>
          {availableVoices.map((voice) => (
            <div key={voice.voiceURI} className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50">
              <div className="flex items-center space-x-3">
                <RadioGroupItem value={voice.voiceURI} id={voice.voiceURI} disabled={isProcessing} />
                <Label htmlFor={voice.voiceURI} className="cursor-pointer">
                  {voice.name} ({voice.lang})
                </Label>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handlePreviewVoice(voice)}
                disabled={isProcessing || (speechSynthesis.speaking && isPreviewing !== voice.voiceURI)}
                aria-label={`Preview voice ${voice.name}`}
                className="h-8 w-8"
              >
                {isPreviewing === voice.voiceURI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between gap-2 pt-6">
        <Button variant="outline" onClick={handleSelectDefault} disabled={isProcessing}>
          Use Default Voice
        </Button>
        <Button onClick={handleConfirm} disabled={isProcessing || !selectedVoiceURI}>
          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Confirm Selection
        </Button>
      </CardFooter>
    </Card>
  );
}
