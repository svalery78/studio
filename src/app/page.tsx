
"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { AppHeader } from '@/components/layout/header';
import { MainContainer } from '@/components/layout/main-container';
// SettingsForm is no longer used for initial setup, but might be useful for editing later.
// import { SettingsForm, type SettingsFormValues } from '@/components/settings-form';
import { ChatWindow } from '@/components/chat/chat-window';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import { startConversation } from '@/ai/flows/start-conversation';
import { continueConversation } from '@/ai/flows/continue-conversation';
import { generateSelfie, type GenerateSelfieOutput } from '@/ai/flows/generate-selfie';
import { generateAppearanceOptions } from '@/ai/flows/generate-appearance-options';
import { getSetupPrompt, type GetSetupPromptInput, type GetSetupPromptOutput, type SetupStepType as AiSetupStep } from '@/ai/flows/get-setup-prompt';
import type { AppSettings, Message } from '@/lib/constants';
import { LOCAL_STORAGE_SETTINGS_KEY, DEFAULT_USERNAME, DEFAULT_PERSONALITY_TRAITS, DEFAULT_TOPIC_PREFERENCES, DEFAULT_APPEARANCE_DESCRIPTION } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle } from 'lucide-react';

// Client-side representation of setup progress
type ClientSetupStep = 
  | 'INITIAL_LOAD'
  | 'AWAITING_AI_GREETING' // AI is about to send first message
  | 'AWAITING_USER_NAME' // User needs to provide name
  | 'AWAITING_USER_PERSONALITY' // User needs to provide personality
  | 'AWAITING_USER_TOPICS' // User needs to provide topics
  | 'AWAITING_USER_APPEARANCE' // User needs to provide appearance description
  | 'AWAITING_AI_CONFIRMATION' // AI is about to confirm before generation
  | 'GENERATING_APPEARANCE' // Visual loader state
  | 'SELECTING_AVATAR' // User is selecting avatar
  | 'CHAT_READY'; // Setup complete

// For AI flow
const AI_SETUP_STEPS = {
  INITIATE: 'INITIATE_SETUP' as AiSetupStep,
  ASK_PERSONALITY: 'ASK_PERSONALITY' as AiSetupStep,
  ASK_TOPICS: 'ASK_TOPICS' as AiSetupStep,
  ASK_APPEARANCE: 'ASK_APPEARANCE_DESCRIPTION' as AiSetupStep,
  CONFIRM_GENERATION: 'CONFIRM_BEFORE_GENERATION' as AiSetupStep,
};

// This type is for form values collected during setup
export type SettingsFormValues = {
  userName: string;
  personalityTraits: string;
  topicPreferences: string;
  appearanceDescription: string;
};

// Visual phases for UI rendering (especially for appearance generation/selection)
type SetupVisualPhase = 'conversational_setup' | 'appearance_pending' | 'appearance_selection' | 'chat_ready';


export default function VirtualDatePage() {
  const [appSettings, setAppSettings] = useLocalStorage<AppSettings | null>(LOCAL_STORAGE_SETTINGS_KEY, null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isInitializing, setIsInitializing] = useState(true); // For the very first page load determination
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [isGeneratingSelfie, setIsGeneratingSelfie] = useState(false);

  const [clientSetupStep, setClientSetupStep] = useState<ClientSetupStep>('INITIAL_LOAD');
  const [setupVisualPhase, setSetupVisualPhase] = useState<SetupVisualPhase>('conversational_setup');
  
  const [settingsDraft, setSettingsDraft] = useState<Partial<SettingsFormValues>>({});
  const [appearanceOptions, setAppearanceOptions] = useState<string[]>([]);
  const [initialLanguageHint, setInitialLanguageHint] = useState<string>('Hello');


  const { toast } = useToast();

  useEffect(() => {
    // Attempt to get browser language for the very first AI message
    if (typeof window !== 'undefined' && navigator.language) {
      setInitialLanguageHint("User's preferred language seems to be: " + navigator.language.split('-')[0]);
    }
  }, []);


  useEffect(() => {
    const loadStateAndInitiateSetup = async () => {
      setIsInitializing(true);
      const storedSettingsItem = window.localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);

      if (storedSettingsItem && storedSettingsItem !== "null") {
        const parsedSettings = JSON.parse(storedSettingsItem) as AppSettings;
        if (parsedSettings.selectedAvatarDataUri && parsedSettings.userName && parsedSettings.personalityTraits && parsedSettings.topicPreferences && parsedSettings.appearanceDescription) {
          setAppSettings(parsedSettings);
          setClientSetupStep('CHAT_READY');
          setSetupVisualPhase('chat_ready');
          // Ensure AI is not marked as responding initially if settings are loaded
          setIsAiResponding(false); 
          if (messages.length === 0) { 
            setIsAiResponding(true);
            try {
              const { firstMessage } = await startConversation({
                personalityTraits: parsedSettings.personalityTraits,
                topicPreferences: parsedSettings.topicPreferences,
              });
              addMessage({ sender: 'ai', text: `Welcome back, ${parsedSettings.userName}! ${firstMessage}`});
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
          window.localStorage.removeItem(LOCAL_STORAGE_SETTINGS_KEY);
          setClientSetupStep('AWAITING_AI_GREETING');
          setSetupVisualPhase('conversational_setup');
          setIsAiResponding(false); // Ensure AI is not marked as responding
        }
      } else {
        // No settings found, start fresh
        setAppSettings(null);
        setClientSetupStep('AWAITING_AI_GREETING');
        setSetupVisualPhase('conversational_setup');
        setIsAiResponding(false); // Ensure AI is not marked as responding
      }
      setIsInitializing(false);
    };
    loadStateAndInitiateSetup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    const runAISetupStep = async () => {
      if (clientSetupStep === 'AWAITING_AI_GREETING' && messages.length === 0 && !isAiResponding) {
        setIsAiResponding(true);
        try {
          const inputForAISetup: GetSetupPromptInput = { currentStep: AI_SETUP_STEPS.INITIATE, userRawInput: initialLanguageHint };
          const response: GetSetupPromptOutput = await getSetupPrompt(inputForAISetup);
          addMessage({ sender: 'ai', text: response.aiResponse });
          setClientSetupStep('AWAITING_USER_NAME');
        } catch (error) {
          console.error("Error getting initial setup prompt:", error);
          toast({ title: "Setup Error", description: "Could not start setup.", variant: "destructive" });
          // Optionally reset to a safe state or provide a specific message
        } finally {
          setIsAiResponding(false);
        }
      }
    };
    if (!isInitializing) { 
        runAISetupStep();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSetupStep, isInitializing, initialLanguageHint, messages.length]); // Added messages.length & isAiResponding to dependencies

  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, { ...message, id: Date.now().toString(), timestamp: Date.now() }]);
  }, []);
  
  const handleSendMessage = async (messageText: string) => {
    const trimmedMessage = messageText.trim();

    if (trimmedMessage.toLowerCase() === '/start') {
      setAppSettings(null); 
      setMessages([]);
      setSettingsDraft({});
      setAppearanceOptions([]);
      setClientSetupStep('AWAITING_AI_GREETING'); 
      setSetupVisualPhase('conversational_setup');
      setIsAiResponding(false);
      setIsGeneratingSelfie(false);
      toast({ title: "New Chat Started", description: "Let's set up your AI companion!" });
      // The useEffect for AWAITING_AI_GREETING will kick in to send the first message.
      return;
    }
    
    addMessage({ sender: 'user', text: trimmedMessage });
    setIsAiResponding(true);

    let nextAiFlowStep: AiSetupStep | null = null;
    let nextClientStep: ClientSetupStep | null = null;
    let updatedSettingsDraft = { ...settingsDraft };
    let userLanguageProvider = trimmedMessage; 

    try {
      if (clientSetupStep === 'AWAITING_USER_NAME') {
        updatedSettingsDraft.userName = trimmedMessage || DEFAULT_USERNAME; 
        nextAiFlowStep = AI_SETUP_STEPS.ASK_PERSONALITY;
        nextClientStep = 'AWAITING_USER_PERSONALITY';
      } else if (clientSetupStep === 'AWAITING_USER_PERSONALITY') {
        updatedSettingsDraft.personalityTraits = trimmedMessage || DEFAULT_PERSONALITY_TRAITS; 
        nextAiFlowStep = AI_SETUP_STEPS.ASK_TOPICS;
        nextClientStep = 'AWAITING_USER_TOPICS';
      } else if (clientSetupStep === 'AWAITING_USER_TOPICS') {
        updatedSettingsDraft.topicPreferences = trimmedMessage || DEFAULT_TOPIC_PREFERENCES; 
        nextAiFlowStep = AI_SETUP_STEPS.ASK_APPEARANCE;
        nextClientStep = 'AWAITING_USER_APPEARANCE';
      } else if (clientSetupStep === 'AWAITING_USER_APPEARANCE') {
        updatedSettingsDraft.appearanceDescription = trimmedMessage || DEFAULT_APPEARANCE_DESCRIPTION; 
        nextAiFlowStep = AI_SETUP_STEPS.CONFIRM_GENERATION;
        nextClientStep = 'AWAITING_AI_CONFIRMATION'; 
      } else if (clientSetupStep === 'CHAT_READY' && appSettings) {
        const lowerMessageText = trimmedMessage.toLowerCase();
        const selfieKeywords = ['selfie', 'селфи', 'фото', 'photo', 'picture', 'pic'];
        if (selfieKeywords.some(keyword => lowerMessageText.includes(keyword))) {
          await handleGenerateSelfieRequest();
        } else {
          const chatHistory = messages
            .slice(-6, -1) 
            .map(msg => `${msg.sender === 'user' ? appSettings.userName : 'AI Girlfriend'}: ${msg.text || (msg.imageUrl ? '[sent a selfie]' : '')}`)
            .join('\n');
          const { response } = await continueConversation({
            lastUserMessage: trimmedMessage,
            chatHistory,
            personalityTraits: appSettings.personalityTraits,
            topicPreferences: appSettings.topicPreferences,
          });
          addMessage({ sender: 'ai', text: response });
        }
        setIsAiResponding(false);
        return;
      } else {
        console.warn("Message sent in unexpected setup step:", clientSetupStep);
        setIsAiResponding(false);
        return;
      }

      setSettingsDraft(updatedSettingsDraft);

      if (nextAiFlowStep) {
        const aiResponse = await getSetupPrompt({
          currentStep: nextAiFlowStep,
          userName: updatedSettingsDraft.userName,
          userRawInput: userLanguageProvider,
        });
        addMessage({ sender: 'ai', text: aiResponse.aiResponse });

        if (nextAiFlowStep === AI_SETUP_STEPS.CONFIRM_GENERATION) {
          setClientSetupStep('GENERATING_APPEARANCE');
          setSetupVisualPhase('appearance_pending');
          
          if (!updatedSettingsDraft.appearanceDescription) { 
            toast({ title: "Error", description: "Appearance description somehow became empty.", variant: "destructive" });
            setClientSetupStep('AWAITING_USER_APPEARANCE'); 
            setSetupVisualPhase('conversational_setup');
            setIsAiResponding(false);
            return; 
          }
          const { portraits } = await generateAppearanceOptions({ appearanceDescription: updatedSettingsDraft.appearanceDescription });
          setAppearanceOptions(portraits);
          setSetupVisualPhase('appearance_selection');
          setClientSetupStep('SELECTING_AVATAR');
        } else if (nextClientStep) {
          setClientSetupStep(nextClientStep);
        }
      }
    } catch (error) {
      console.error("Error during setup step:", error);
      toast({ title: "Setup Error", description: "Something went wrong during setup. Please try again or type /start.", variant: "destructive" });
      setClientSetupStep('AWAITING_AI_GREETING');
      setMessages([]); 
      setSettingsDraft({});
      setSetupVisualPhase('conversational_setup');
    } finally {
      setIsAiResponding(false);
    }
  };

  const handleAvatarSelection = useCallback(async (selectedImageUri: string) => {
    if (!settingsDraft.userName || !settingsDraft.personalityTraits || !settingsDraft.topicPreferences || !settingsDraft.appearanceDescription) {
        toast({ title: "Setup Incomplete", description: "Some settings are missing. Please restart with /start.", variant: "destructive"});
        setClientSetupStep('AWAITING_AI_GREETING'); 
        setMessages([]);
        setSettingsDraft({});
        setSetupVisualPhase('conversational_setup');
        return;
    }
    setIsAiResponding(true); 

    const finalAppSettings: AppSettings = {
      userName: settingsDraft.userName,
      personalityTraits: settingsDraft.personalityTraits,
      topicPreferences: settingsDraft.topicPreferences,
      appearanceDescription: settingsDraft.appearanceDescription,
      selectedAvatarDataUri: selectedImageUri,
    };
    setAppSettings(finalAppSettings);
    setAppearanceOptions([]);
    
    try {
      const { firstMessage } = await startConversation({
        personalityTraits: finalAppSettings.personalityTraits,
        topicPreferences: finalAppSettings.topicPreferences,
      });
      addMessage({ sender: 'ai', text: `Great choice, ${finalAppSettings.userName}! I'm all set up. ${firstMessage}` });
      setClientSetupStep('CHAT_READY');
      setSetupVisualPhase('chat_ready');
    } catch (error) {
      console.error("Error starting conversation after avatar selection:", error);
      toast({ title: "Error", description: "Could not start conversation.", variant: "destructive" });
      addMessage({ sender: 'ai', text: "I'm all set with my new look, but I'm having a little trouble starting our chat. Let's try again in a moment!"});
      setClientSetupStep('CHAT_READY');
      setSetupVisualPhase('chat_ready');
    } finally {
      setIsAiResponding(false);
    }
  }, [settingsDraft, setAppSettings, toast, addMessage]);
  
  const handleGenerateSelfieRequest = async () => {
    if (!appSettings || !appSettings.selectedAvatarDataUri || clientSetupStep !== 'CHAT_READY') return;

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
  
  if (isInitializing) {
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader />
        <MainContainer>
          <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 mt-4 text-lg text-muted-foreground">
              Loading your VirtualDate...
            </p>
          </div>
        </MainContainer>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen max-h-screen">
      <AppHeader />
      <MainContainer>
        {setupVisualPhase === 'conversational_setup' && clientSetupStep !== 'GENERATING_APPEARANCE' && clientSetupStep !== 'SELECTING_AVATAR' && (
           <div className="h-[calc(100vh-10rem)]"> 
            <ChatWindow
              messages={messages}
              onSendMessage={handleSendMessage}
              onSelfieRequest={handleGenerateSelfieRequest} 
              isSendingMessage={isAiResponding}
              appSettings={appSettings} 
              chatInputDisabled={isAiResponding || (clientSetupStep !== 'AWAITING_USER_NAME' && clientSetupStep !== 'AWAITING_USER_PERSONALITY' && clientSetupStep !== 'AWAITING_USER_TOPICS' && clientSetupStep !== 'AWAITING_USER_APPEARANCE')}
              selfieButtonDisabled={true} 
            />
          </div>
        )}
        {setupVisualPhase === 'appearance_pending' && (
          <Card className="w-full max-w-lg mx-auto shadow-xl my-auto">
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
        {setupVisualPhase === 'appearance_selection' && appearanceOptions.length > 0 && (
          <Card className="w-full max-w-2xl mx-auto shadow-xl my-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Choose Her Look</CardTitle>
              <CardDescription>
                Select the appearance you like best for your AI companion. This will be her primary look.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {appearanceOptions.map((src, index) => (
                <div key={index} className="relative aspect-[3/4] sm:aspect-square rounded-lg overflow-hidden shadow-md cursor-pointer group ring-2 ring-transparent hover:ring-accent focus-visible:ring-accent transition-all"
                  onClick={() => !isAiResponding && handleAvatarSelection(src)} 
                  onKeyDown={(e) => e.key === 'Enter' && !isAiResponding && handleAvatarSelection(src)}
                  tabIndex={isAiResponding ? -1 : 0}
                  role="button"
                  aria-label={`Select appearance option ${index + 1}`}
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
             <CardFooter className="pt-2 pb-4 text-center flex-col items-center">
              <p className="text-sm text-muted-foreground">Click an image to select it. {isAiResponding && "(Processing...)"}</p>
            </CardFooter>
          </Card>
        )}
        {setupVisualPhase === 'chat_ready' && appSettings && (
          <div className="h-[calc(100vh-10rem)]">
            <ChatWindow
              messages={messages}
              onSendMessage={handleSendMessage}
              onSelfieRequest={handleGenerateSelfieRequest}
              isSendingMessage={isAiResponding || isGeneratingSelfie}
              appSettings={appSettings}
              chatInputDisabled={isAiResponding || isGeneratingSelfie}
              selfieButtonDisabled={isAiResponding || isGeneratingSelfie}
            />
          </div>
        )}
      </MainContainer>
    </div>
  );
}

    
