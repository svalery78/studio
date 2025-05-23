
"use client";

import { useState, useEffect, useCallback } from 'react';
import { AppHeader } from '@/components/layout/header';
import { MainContainer } from '@/components/layout/main-container';
import { SettingsForm } from '@/components/settings-form';
import { ChatWindow } from '@/components/chat/chat-window';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import { startConversation } from '@/ai/flows/start-conversation';
import { continueConversation } from '@/ai/flows/continue-conversation';
import { generateSelfie, type GenerateSelfieOutput } from '@/ai/flows/generate-selfie';
import type { AppSettings, Message } from '@/lib/constants';
import { LOCAL_STORAGE_SETTINGS_KEY, DEFAULT_USERNAME, DEFAULT_PERSONALITY_TRAITS, DEFAULT_TOPIC_PREFERENCES } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const initialAppSettings: AppSettings = {
  userName: DEFAULT_USERNAME,
  personalityTraits: DEFAULT_PERSONALITY_TRAITS,
  topicPreferences: DEFAULT_TOPIC_PREFERENCES,
};

export default function VirtualDatePage() {
  const [appSettings, setAppSettings] = useLocalStorage<AppSettings | null>(LOCAL_STORAGE_SETTINGS_KEY, null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [isGeneratingSelfie, setIsGeneratingSelfie] = useState(false);

  const { toast } = useToast();

  const handleSettingsSubmit = useCallback(async (settings: AppSettings) => {
    setIsAiResponding(true);
    setAppSettings(settings);
    setMessages([]); 
    try {
      const { firstMessage } = await startConversation({
        personalityTraits: settings.personalityTraits,
        topicPreferences: settings.topicPreferences,
      });
      setMessages([{ id: Date.now().toString(), sender: 'ai', text: firstMessage, timestamp: Date.now() }]);
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast({ title: "Error", description: "Could not start conversation with AI.", variant: "destructive" });
    } finally {
      setIsAiResponding(false);
    }
  }, [setAppSettings, toast]);
  
  useEffect(() => {
    const loadInitialSettings = async () => {
      const storedSettings = window.localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings) as AppSettings;
        
        if (messages.length === 0 && parsedSettings?.userName) { 
           setIsAiResponding(true);
           try {
            const { firstMessage } = await startConversation({
              personalityTraits: parsedSettings.personalityTraits,
              topicPreferences: parsedSettings.topicPreferences,
            });
            setMessages([{ id: Date.now().toString(), sender: 'ai', text: `Welcome back, ${parsedSettings.userName}! ${firstMessage}`, timestamp: Date.now() }]);
           } catch (error) {
              console.error("Error restarting conversation:", error);
              toast({ title: "Error", description: "Could not restart conversation.", variant: "destructive" });
           } finally {
              setIsAiResponding(false);
           }
        }
      }
      setIsInitializing(false);
    };
    loadInitialSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [toast]); // messages dependency removed to avoid re-triggering on message send

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, { ...message, id: Date.now().toString(), timestamp: Date.now() }]);
  };

  const handleGenerateSelfieRequest = async () => {
    if (!appSettings) return;

    setIsGeneratingSelfie(true);
    // No user message for selfie request is added here anymore, AI response will include text
    // addMessage({ sender: 'user', text: "Hey, can you send me a selfie?" });

    try {
      const chatHistoryForSelfie = messages
        .slice(-5) // Take last 5 messages for context
        .map(msg => `${msg.sender === 'user' ? appSettings.userName : 'AI Girlfriend'}: ${msg.text || (msg.imageUrl ? '[sent a selfie]' : '')}`)
        .join('\n');

      const result: GenerateSelfieOutput = await generateSelfie({
        personalityTraits: appSettings.personalityTraits,
        topicPreferences: appSettings.topicPreferences,
        chatHistory: chatHistoryForSelfie,
      });
      addMessage({ sender: 'ai', text: result.sceneDescription, imageUrl: result.selfieDataUri });
    } catch (error) {
      console.error("Error generating selfie:", error);
      toast({ title: "Selfie Error", description: "Could not generate selfie.", variant: "destructive" });
      addMessage({ sender: 'ai', text: "Oops, I couldn't take a selfie right now. Maybe the camera is shy!" });
    } finally {
      setIsGeneratingSelfie(false);
    }
  };

  const handleSendMessage = async (messageText: string) => {
    if (!appSettings) return;
    addMessage({ sender: 'user', text: messageText });

    // Updated keywords to be more robust for selfie requests
    const lowerMessageText = messageText.toLowerCase();
    const selfieKeywords = ['selfie', 'селфи', 'фото', 'photo', 'picture', 'pic'];
    if (selfieKeywords.some(keyword => lowerMessageText.includes(keyword))) {
      await handleGenerateSelfieRequest();
      return;
    }

    setIsAiResponding(true);
    try {
      const chatHistory = messages
        .slice(-5) 
        .map(msg => `${msg.sender === 'user' ? appSettings.userName : 'AI Girlfriend'}: ${msg.text || (msg.imageUrl ? '[sent a selfie]' : '')}`)
        .join('\n');

      const { response } = await continueConversation({
        lastUserMessage: messageText,
        chatHistory,
        personalityTraits: appSettings.personalityTraits,
        topicPreferences: appSettings.topicPreferences,
      });
      addMessage({ sender: 'ai', text: response });
    } catch (error) {
      console.error("Error continuing conversation:", error);
      toast({ title: "Error", description: "AI is currently unavailable.", variant: "destructive" });
      addMessage({ sender: 'ai', text: "Sorry, I'm having a little trouble thinking right now. Let's try again in a moment." });
    } finally {
      setIsAiResponding(false);
    }
  };
  
  if (isInitializing) {
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader />
        <MainContainer>
          <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg text-muted-foreground">Loading your VirtualDate...</p>
          </div>
        </MainContainer>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen max-h-screen">
      <AppHeader />
      <MainContainer>
        {!appSettings ? (
          <SettingsForm onSubmit={handleSettingsSubmit} isSubmitting={isAiResponding} initialSettings={initialAppSettings} />
        ) : (
          <div className="h-[calc(100vh-10rem)]"> {/* Adjusted height */}
            <ChatWindow
              messages={messages}
              onSendMessage={handleSendMessage}
              onSelfieRequest={handleGenerateSelfieRequest}
              isSendingMessage={isAiResponding || isGeneratingSelfie}
              appSettings={appSettings}
            />
          </div>
        )}
      </MainContainer>
    </div>
  );
}
