
"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { AppHeader } from '@/components/layout/header';
import { MainContainer } from '@/components/layout/main-container';
import { SettingsForm, type SettingsFormValues } from '@/components/settings-form';
import { ChatWindow } from '@/components/chat/chat-window';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import { startConversation } from '@/ai/flows/start-conversation';
import { continueConversation } from '@/ai/flows/continue-conversation';
import { generateSelfie, type GenerateSelfieOutput } from '@/ai/flows/generate-selfie';
import { generateAppearanceOptions } from '@/ai/flows/generate-appearance-options';
import type { AppSettings, Message } from '@/lib/constants';
import { LOCAL_STORAGE_SETTINGS_KEY, DEFAULT_USERNAME, DEFAULT_PERSONALITY_TRAITS, DEFAULT_TOPIC_PREFERENCES, DEFAULT_APPEARANCE_DESCRIPTION } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle } from 'lucide-react';

type SetupPhase = 'initial_settings' | 'appearance_pending' | 'appearance_selection' | 'chat_ready';

const defaultInitialAppSettings: AppSettings = {
  userName: DEFAULT_USERNAME,
  personalityTraits: DEFAULT_PERSONALITY_TRAITS,
  topicPreferences: DEFAULT_TOPIC_PREFERENCES,
  appearanceDescription: DEFAULT_APPEARANCE_DESCRIPTION,
  selectedAvatarDataUri: null,
};


export default function VirtualDatePage() {
  const [appSettings, setAppSettings] = useLocalStorage<AppSettings | null>(LOCAL_STORAGE_SETTINGS_KEY, null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAiResponding, setIsAiResponding] = useState(false); // For chat messages and initial setup messages
  const [isGeneratingSelfie, setIsGeneratingSelfie] = useState(false);

  const [setupPhase, setSetupPhase] = useState<SetupPhase>('initial_settings');
  const [appearanceOptions, setAppearanceOptions] = useState<string[]>([]);
  const [currentSettingsDraft, setCurrentSettingsDraft] = useState<Partial<AppSettings> | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    const loadState = async () => {
      setIsInitializing(true);
      const storedSettingsItem = window.localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);

      if (storedSettingsItem && storedSettingsItem !== "null") {
        const parsedSettings = JSON.parse(storedSettingsItem) as AppSettings;
        if (parsedSettings.selectedAvatarDataUri && parsedSettings.userName) {
          setAppSettings(parsedSettings);
          setSetupPhase('chat_ready');
          if (messages.length === 0) {
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
        } else {
          // Incomplete settings, force full setup
          setAppSettings(null); 
          setSetupPhase('initial_settings');
          window.localStorage.removeItem(LOCAL_STORAGE_SETTINGS_KEY); // Clean up partial storage
        }
      } else {
        // No settings found, start fresh
        setAppSettings(null);
        setSetupPhase('initial_settings');
      }
      setIsInitializing(false);
    };
    loadState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  const handleSettingsSubmit = useCallback(async (formValues: SettingsFormValues) => {
    setIsAiResponding(true);
    setCurrentSettingsDraft(formValues);
    setSetupPhase('appearance_pending');
    setMessages([]);
    try {
      const { portraits } = await generateAppearanceOptions({
        appearanceDescription: formValues.appearanceDescription,
      });
      setAppearanceOptions(portraits);
      setSetupPhase('appearance_selection');
    } catch (error) {
      console.error("Error generating appearance options:", error);
      toast({ title: "Appearance Generation Error", description: "Could not generate appearance options. Please try again.", variant: "destructive" });
      setSetupPhase('initial_settings'); // Revert to settings form
    } finally {
      setIsAiResponding(false);
    }
  }, [toast]);

  const handleAvatarSelection = useCallback(async (selectedImageUri: string) => {
    if (!currentSettingsDraft) return;
    setIsAiResponding(true);

    const finalAppSettings: AppSettings = {
      ...defaultInitialAppSettings, // Ensure all AppSettings fields are present
      ...currentSettingsDraft,
      selectedAvatarDataUri: selectedImageUri,
    };
    setAppSettings(finalAppSettings); // This also saves to localStorage via the hook
    setSetupPhase('chat_ready');
    setAppearanceOptions([]);
    setCurrentSettingsDraft(null);

    try {
      const { firstMessage } = await startConversation({
        personalityTraits: finalAppSettings.personalityTraits,
        topicPreferences: finalAppSettings.topicPreferences,
      });
      setMessages([{ id: Date.now().toString(), sender: 'ai', text: firstMessage, timestamp: Date.now() }]);
    } catch (error) {
      console.error("Error starting conversation after avatar selection:", error);
      toast({ title: "Error", description: "Could not start conversation.", variant: "destructive" });
    } finally {
      setIsAiResponding(false);
    }
  }, [currentSettingsDraft, setAppSettings, toast]);
  
  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, { ...message, id: Date.now().toString(), timestamp: Date.now() }]);
  };

  const handleGenerateSelfieRequest = async () => {
    if (!appSettings || !appSettings.selectedAvatarDataUri) return;

    setIsGeneratingSelfie(true);    
    try {
      const chatHistoryForSelfie = messages
        .slice(-5) 
        .map(msg => `${msg.sender === 'user' ? appSettings.userName : 'AI Girlfriend'}: ${msg.text || (msg.imageUrl ? '[sent a selfie]' : '')}`)
        .join('\n');

      const result: GenerateSelfieOutput = await generateSelfie({
        personalityTraits: appSettings.personalityTraits,
        topicPreferences: appSettings.topicPreferences,
        chatHistory: chatHistoryForSelfie,
        baseImageDataUri: appSettings.selectedAvatarDataUri,
      });
      addMessage({ sender: 'ai', imageUrl: result.selfieDataUri });
    } catch (error) {
      console.error("Error generating selfie:", error);
      toast({ title: "Selfie Error", description: "Could not generate selfie.", variant: "destructive" });
      addMessage({ sender: 'ai', text: "Oops, I couldn't take a selfie right now. Maybe the camera is shy!" });
    } finally {
      setIsGeneratingSelfie(false);
    }
  };

  const handleSendMessage = async (messageText: string) => {
    const trimmedMessage = messageText.trim();

    if (trimmedMessage.toLowerCase() === '/start') {
      setAppSettings(null); 
      setMessages([]);
      setSetupPhase('initial_settings');
      setCurrentSettingsDraft(null);
      setAppearanceOptions([]);
      setIsAiResponding(false);
      setIsGeneratingSelfie(false);
      toast({ title: "New Chat Started", description: "Please configure your AI companion to begin." });
      return;
    }

    if (!appSettings || setupPhase !== 'chat_ready') return;
    addMessage({ sender: 'user', text: trimmedMessage });

    const lowerMessageText = trimmedMessage.toLowerCase();
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
        lastUserMessage: trimmedMessage,
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
          <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 mt-4 text-lg text-muted-foreground">Loading your VirtualDate...</p>
          </div>
        </MainContainer>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen max-h-screen">
      <AppHeader />
      <MainContainer>
        {setupPhase === 'initial_settings' && (
          <SettingsForm 
            onSubmit={handleSettingsSubmit} 
            isSubmitting={isAiResponding} 
            initialSettings={defaultInitialAppSettings} 
          />
        )}
        {setupPhase === 'appearance_pending' && (
          <Card className="w-full max-w-lg mx-auto shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Generating Looks...</CardTitle>
              <CardDescription>
                Your AI companion is preparing some appearance options for you. This might take a moment.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Please wait...</p>
            </CardContent>
          </Card>
        )}
        {setupPhase === 'appearance_selection' && appearanceOptions.length > 0 && (
          <Card className="w-full max-w-2xl mx-auto shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Choose Her Look</CardTitle>
              <CardDescription>
                Select the appearance you like best for your AI companion. This will be her primary look.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              {appearanceOptions.map((src, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden shadow-md cursor-pointer group ring-2 ring-transparent hover:ring-accent focus-visible:ring-accent transition-all"
                  onClick={() => handleAvatarSelection(src)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAvatarSelection(src)}
                  tabIndex={0}
                >
                  <Image 
                    src={src} 
                    alt={`Appearance option ${index + 1}`} 
                    layout="fill" 
                    objectFit="cover"
                    data-ai-hint="woman portrait" 
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <CheckCircle className="h-12 w-12 text-white/80" />
                  </div>
                </div>
              ))}
            </CardContent>
             <CardContent className="pt-2 pb-4 text-center">
              <p className="text-sm text-muted-foreground">Click an image to select it.</p>
            </CardContent>
          </Card>
        )}
        {setupPhase === 'chat_ready' && appSettings && (
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

