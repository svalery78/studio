
"use client";

import { useState, type FormEvent, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Image as ImageIcon, Loader2, Mic, MicOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

interface ChatInputProps {
  onSendMessage: (messageText: string) => void;
  onSelfieRequest: (messageText?: string) => void;
  isSending: boolean;
  inputDisabled?: boolean;
  selfieDisabled?: boolean;
}

export function ChatInput({
  onSendMessage,
  onSelfieRequest,
  isSending,
  inputDisabled = false,
  selfieDisabled = false,
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = false; // Stop recording after a pause
        recognition.interimResults = true; // Get results as they are being spoken
        recognition.lang = navigator.language || 'en-US'; // Use browser's language

        recognition.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          // Update input with interim transcript, and finalize with final transcript
          setInputValue(prev => finalTranscript ? (prev.endsWith(interimTranscript.trim()) ? prev.slice(0, -interimTranscript.trim().length) : prev) + finalTranscript : prev + interimTranscript);

          if (finalTranscript) {
            // Optionally, stop recording on final result if continuous is false
            // setIsRecording(false); 
            // speechRecognitionRef.current?.stop();
          }
        };

        recognition.onerror = (event) => {
          console.error("Speech recognition error", event.error);
          let errorMessage = "Voice recognition error.";
          if (event.error === 'no-speech') {
            errorMessage = "No speech was detected. Please try again.";
          } else if (event.error === 'audio-capture') {
            errorMessage = "Microphone problem. Please ensure it's working.";
          } else if (event.error === 'not-allowed') {
            errorMessage = "Microphone access denied. Please enable it in browser settings.";
          }
          toast({ title: "Voice Input Error", description: errorMessage, variant: "destructive" });
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        speechRecognitionRef.current = recognition;
      } else {
        toast({ title: "Voice Input", description: "Voice recognition is not supported in your browser.", variant: "destructive" });
      }
    }

    return () => {
      speechRecognitionRef.current?.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleRecording = () => {
    if (!speechRecognitionRef.current) {
      toast({ title: "Voice Input Error", description: "Voice recognition not available.", variant: "destructive" });
      return;
    }

    if (isRecording) {
      speechRecognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        // Clear previous input before starting new recording
        // setInputValue(""); // Optional: clear input on new recording start
        speechRecognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error("Error starting speech recognition", e);
        toast({ title: "Voice Input Error", description: "Could not start voice recording.", variant: "destructive" });
        setIsRecording(false);
      }
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isRecording && speechRecognitionRef.current) {
        speechRecognitionRef.current.stop(); // Stop recording before sending
    }
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

  const handleSelfieRequest = () => {
    if (!isSending && !selfieDisabled) {
      onSelfieRequest();
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
          placeholder={inputDisabled ? "Please respond to the setup questions..." : (isRecording ? "Listening..." : "Type your message or use voice...")}
          className="flex-1 resize-none min-h-[40px] max-h-[120px] rounded-full px-4 py-2 shadow-sm focus-visible:ring-1 focus-visible:ring-ring"
          rows={1}
          disabled={isSending || inputDisabled}
        />
        <TooltipProvider>
          {speechRecognitionRef.current && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleRecording}
                  disabled={isSending || inputDisabled}
                  className="text-muted-foreground hover:text-accent-foreground"
                >
                  {isRecording ? <MicOff className="h-5 w-5 text-destructive" /> : <Mic className="h-5 w-5" />}
                  <span className="sr-only">{isRecording ? "Stop recording" : "Start recording"}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isRecording ? "Stop voice input" : "Start voice input"}</p>
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleSelfieRequest}
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
