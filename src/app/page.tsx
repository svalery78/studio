
"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { AppHeader } from '@/components/layout/header';
import { MainContainer } from '@/components/layout/main-container';
import { ChatWindow } from '@/components/chat/chat-window';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import { startConversation } from '@/ai/flows/start-conversation';
import { continueConversation, type ContinueConversationOutput } from '@/ai/flows/continue-conversation';
import { generateSelfie, type GenerateSelfieInput, type GenerateSelfieOutput } from '@/ai/flows/generate-selfie';
import { generateAppearanceOptions } from '@/ai/flows/generate-appearance-options';
import { getSetupPrompt, type GetSetupPromptInput, type GetSetupPromptOutput, type SetupStepType as AiSetupStep } from '@/ai/flows/get-setup-prompt';
import { generatePhotoshootImages, type GeneratePhotoshootImagesInput, type GeneratePhotoshootImagesOutput } from '@/ai/flows/generate-photoshoot-images';
import type { AppSettings, Message } from '@/lib/constants';
import { LOCAL_STORAGE_SETTINGS_KEY, DEFAULT_SETTINGS_DRAFT } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle } from 'lucide-react';
import { VoiceSelector } from '@/components/voice-selector';

type ClientSetupStep = 
  | 'INITIAL_LOAD'
  | 'AWAITING_AI_GREETING'
  | 'AWAITING_USER_NAME'
  | 'AWAITING_USER_PERSONALITY'
  | 'AWAITING_USER_TOPICS'
  | 'AWAITING_USER_VOICE_DECISION'
  | 'SELECTING_VOICE'
  | 'AWAITING_USER_APPEARANCE'
  | 'AWAITING_AI_CONFIRMATION'
  | 'GENERATING_APPEARANCE'
  | 'SELECTING_AVATAR'
  | 'CHAT_READY';

const AI_SETUP_STEPS = {
  INITIATE: 'INITIATE_SETUP' as AiSetupStep,
  ASK_PERSONALITY: 'ASK_PERSONALITY' as AiSetupStep,
  ASK_TOPICS: 'ASK_TOPICS' as AiSetupStep,
  ASK_VOICE_PREFERENCE: 'ASK_VOICE_PREFERENCE' as AiSetupStep,
  ASK_APPEARANCE: 'ASK_APPEARANCE_DESCRIPTION' as AiSetupStep,
  CONFIRM_GENERATION: 'CONFIRM_BEFORE_GENERATION' as AiSetupStep,
};

type SetupVisualPhase = 'conversational_setup' | 'voice_selection' | 'appearance_pending' | 'appearance_selection' | 'chat_ready';

export default function VirtualDatePage() {
  const [appSettings, setAppSettings] = useLocalStorage<AppSettings | null>(LOCAL_STORAGE_SETTINGS_KEY, null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [isGeneratingSelfie, setIsGeneratingSelfie] = useState(false);
  const [isGeneratingPhotoshoot, setIsGeneratingPhotoshoot] = useState(false);
  const [preAttachedImage, setPreAttachedImage] = useState<string | null>(null); // For image "attached" via a hypothetical button


  const [clientSetupStep, setClientSetupStep] = useState<ClientSetupStep>('INITIAL_LOAD');
  const [setupVisualPhase, setSetupVisualPhase] = useState<SetupVisualPhase>('conversational_setup');
  
  const [settingsDraft, setSettingsDraft] = useState<Partial<AppSettings>>(DEFAULT_SETTINGS_DRAFT);
  const [appearanceOptions, setAppearanceOptions] = useState<string[]>([]);
  const [initialLanguageHint, setInitialLanguageHint] = useState<string>('Hello');
  const [pendingProactiveSelfie, setPendingProactiveSelfie] = useState<{ context: string } | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    // Attempt to get browser language for the very first AI message
    if (typeof window !== 'undefined' && navigator.language) {
      setInitialLanguageHint("User's preferred language seems to be: " + navigator.language.split('-')[0]);
    }
  }, []);

  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          setAvailableVoices(voices);
        }
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);


  useEffect(() => {
    const loadStateAndInitiateSetup = async () => {
      setIsInitializing(true);
      setIsAiResponding(false);
      setIsGeneratingSelfie(false);
      setIsGeneratingPhotoshoot(false);
      setPreAttachedImage(null);
      const storedSettingsItem = window.localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);

      if (storedSettingsItem && storedSettingsItem !== "null") {
        try {
            const parsedSettings = JSON.parse(storedSettingsItem) as AppSettings;
            if (parsedSettings.selectedAvatarDataUri && parsedSettings.userName && parsedSettings.personalityTraits && parsedSettings.topicPreferences && parsedSettings.appearanceDescription) {
              setAppSettings(parsedSettings);
              setSettingsDraft(parsedSettings); 
              setClientSetupStep('CHAT_READY');
              setSetupVisualPhase('chat_ready');
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
                  addMessage({ sender: 'ai', text: "I'm having a little trouble starting our chat right now. Let's try again in a moment!"});
                } finally {
                  setIsAiResponding(false);
                }
              }
            } else {
              console.warn("Stored settings were incomplete. Restarting setup.");
              setAppSettings(null); 
              window.localStorage.removeItem(LOCAL_STORAGE_SETTINGS_KEY);
              setClientSetupStep('AWAITING_AI_GREETING');
              setSetupVisualPhase('conversational_setup');
              setSettingsDraft(DEFAULT_SETTINGS_DRAFT);
              setIsAiResponding(false);
            }
        } catch (e) {
            console.error("Error parsing stored settings. Restarting setup.", e);
            setAppSettings(null); 
            window.localStorage.removeItem(LOCAL_STORAGE_SETTINGS_KEY);
            setClientSetupStep('AWAITING_AI_GREETING');
            setSetupVisualPhase('conversational_setup');
            setSettingsDraft(DEFAULT_SETTINGS_DRAFT);
            setIsAiResponding(false);
        }
      } else {
        setAppSettings(null);
        setClientSetupStep('AWAITING_AI_GREETING');
        setSetupVisualPhase('conversational_setup');
        setSettingsDraft(DEFAULT_SETTINGS_DRAFT);
        setIsAiResponding(false);
      }
      setIsInitializing(false);
    };
    loadStateAndInitiateSetup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    const runAISetupStep = async () => {
      if (clientSetupStep === 'AWAITING_AI_GREETING' && messages.length === 0 && !isAiResponding && !isInitializing) {
        setIsAiResponding(true);
        try {
          const inputForAISetup: GetSetupPromptInput = { currentStep: AI_SETUP_STEPS.INITIATE, userRawInput: initialLanguageHint };
          const response: GetSetupPromptOutput = await getSetupPrompt(inputForAISetup);
          addMessage({ sender: 'ai', text: response.aiResponse });
          setClientSetupStep('AWAITING_USER_NAME');
        } catch (error) {
          console.error("Error getting initial setup prompt:", error);
          toast({ title: "Setup Error", description: "Could not start setup.", variant: "destructive" });
        } finally {
          setIsAiResponding(false);
        }
      }
    };
    if (!isInitializing) { 
        runAISetupStep();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSetupStep, isInitializing, initialLanguageHint, messages.length]);

  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, { ...message, id: Date.now().toString() + Math.random().toString(36).substring(2,7), timestamp: Date.now() }]);
  }, []);
  
  const handleSendMessage = async (messageText: string) => {
    const trimmedMessage = messageText.trim();

    if (trimmedMessage.toLowerCase() === '/start') {
      setAppSettings(null); 
      setMessages([]);
      setSettingsDraft(DEFAULT_SETTINGS_DRAFT);
      setAppearanceOptions([]);
      setPendingProactiveSelfie(null);
      setPreAttachedImage(null);
      setClientSetupStep('AWAITING_AI_GREETING'); 
      setSetupVisualPhase('conversational_setup');
      setIsAiResponding(false); 
      setIsGeneratingSelfie(false); 
      setIsGeneratingPhotoshoot(false);
      window.localStorage.removeItem(LOCAL_STORAGE_SETTINGS_KEY); 
      toast({ title: "New Chat Started", description: "Let's set up your AI companion!" });
       if (messages.length === 0 && !isInitializing) { 
        setIsAiResponding(true);
        try {
            const inputForAISetup: GetSetupPromptInput = { currentStep: AI_SETUP_STEPS.INITIATE, userRawInput: initialLanguageHint };
            const response: GetSetupPromptOutput = await getSetupPrompt(inputForAISetup);
            addMessage({ sender: 'ai', text: response.aiResponse });
            setClientSetupStep('AWAITING_USER_NAME');
        } catch (error) {
            console.error("Error getting initial setup prompt after /start:", error);
        } finally {
            setIsAiResponding(false);
        }
      }
      return;
    } else if (trimmedMessage.toLowerCase().startsWith('/photo ')) {
        if (!appSettings) {
            toast({ title: "Photoshoot Error", description: "Please complete the setup first to use the photoshoot feature.", variant: "destructive" });
            return;
        }
        
        let baseUriToUse: string | undefined | null = null;
        let photoshootDescription = trimmedMessage.substring(7).trim(); 
        let usedPreAttached = false;

        if (preAttachedImage) {
            baseUriToUse = preAttachedImage;
            usedPreAttached = true;
            setPreAttachedImage(null); // Use once
        } else {
            const dataUriRegex = /(data:image\/(?:png|jpeg|gif|webp|svg\+xml);base64,([A-Za-z0-9+/=]+))/;
            const match = photoshootDescription.match(dataUriRegex); // Check description for data URI

            if (match && match[0]) {
                baseUriToUse = match[0];
                photoshootDescription = photoshootDescription.replace(match[0], '').trim();
            } else {
                baseUriToUse = appSettings.selectedAvatarDataUri;
            }
        }

        if (!baseUriToUse) {
            addMessage({ sender: 'ai', text: "I need a base image for the photoshoot. Please complete your avatar setup, include an image data URI in your command, or attach an image before using /photo."});
            return;
        }
        if (!photoshootDescription) {
            addMessage({ sender: 'ai', text: "Please provide a description for the photoshoot after the /photo command. For example: `/photo relaxing by the pool`" });
            return;
        }

        addMessage({ sender: 'user', text: trimmedMessage });
        if (usedPreAttached) {
            addMessage({ sender: 'ai', text: "Understood! Using the image you attached for this photoshoot." });
        } else if (baseUriToUse !== appSettings.selectedAvatarDataUri) {
            addMessage({ sender: 'ai', text: "Understood! Using the image you provided in the command for this photoshoot." });
        }
        await handleGeneratePhotoshootRequest(photoshootDescription, baseUriToUse, appSettings);
        return;
    } else if (trimmedMessage.toLowerCase() === '/voice') {
      if (!settingsDraft.userName && !appSettings?.userName) { 
        toast({ title: "Voice Change", description: "Please complete the initial setup first.", variant: "destructive" });
        return;
      }
      addMessage({ sender: 'ai', text: "Sure, let's choose a new voice for me. You can also use the 'Use Default Voice' option if you prefer." });
      setClientSetupStep('SELECTING_VOICE');
      setSetupVisualPhase('voice_selection');
      setIsAiResponding(false);
      return;
    } else if (trimmedMessage.toLowerCase() === '/repeat') {
      if (appSettings) {
        const newAutoPlayState = !appSettings.autoPlayAiMessages;
        const updatedSettings: AppSettings = { ...appSettings, autoPlayAiMessages: newAutoPlayState };
        setAppSettings(updatedSettings);
        const confirmationText = newAutoPlayState ? "Automatic voice playback enabled." : "Automatic voice playback disabled.";
        addMessage({ sender: 'ai', text: confirmationText });
        toast({ title: "Voice Playback", description: confirmationText });
      } else {
        toast({ title: "Voice Playback", description: "Please complete the setup first to use this command.", variant: "destructive"});
      }
      return;
    }
    
    addMessage({ sender: 'user', text: trimmedMessage });
    setIsAiResponding(true);

    try {
      if (pendingProactiveSelfie && appSettings) {
        const userResponseLower = trimmedMessage.toLowerCase();
        const affirmativeKeywords = ['yes', 'sure', 'ok', 'да', 'ага', 'конечно', 'давай', 'please', 'yep', 'ja', 'si', 'хочу', 'покажи', 'валяй', 'го', 'okey', 'okay', 'fine', 'alright', 'sounds good', 'хорошо', 'ладно', 'согласен', 'согласна'];
        const negativeKeywords = ['no', 'not', 'don\'t', 'нет', 'не надо', 'не хочу', 'nein', 'non', 'откажусь', 'неа', 'nah', 'nope', 'skip', 'неа', 'не буду', 'пропустить'];
        
        let isAffirmative = false;
        const wordsInResponse = userResponseLower.split(/[\s,.;!?]+/);

        for (const keyword of affirmativeKeywords) {
            if (wordsInResponse.includes(keyword)) {
                isAffirmative = true;
                break;
            }
        }
        if (isAffirmative) { 
            for (const negKeyword of negativeKeywords) {
                if (userResponseLower.includes(negKeyword)) { 
                    isAffirmative = false;
                    break;
                }
            }
        }

        if (isAffirmative) { 
          addMessage({ sender: 'ai', text: "Great! One moment... ✨" });
          await handleGenerateSelfieRequest(pendingProactiveSelfie.context, appSettings, trimmedMessage);
        } else {
          addMessage({ sender: 'ai', text: "Alright, no worries! 😊" });
          const conversationOutput: ContinueConversationOutput = await continueConversation({
              lastUserMessage: trimmedMessage, 
              chatHistory: messages.slice(-21, -1) 
                  .map(msg => `${msg.sender === 'user' ? (appSettings?.userName || 'User') : 'AI Girlfriend'}: ${msg.text || (msg.imageUrl ? '[sent a selfie]' : '')}`)
                  .join('\\n'),
              personalityTraits: appSettings.personalityTraits,
              topicPreferences: appSettings.topicPreferences,
          });
          if (conversationOutput.responseText) {
              addMessage({ sender: 'ai', text: conversationOutput.responseText });
          }
          if (conversationOutput.decision === 'IMPLICIT_SELFIE_NOW' && conversationOutput.selfieContext) {
              await handleGenerateSelfieRequest(conversationOutput.selfieContext, appSettings, conversationOutput.responseText);
          } else if (conversationOutput.decision === 'PROACTIVE_SELFIE_OFFER' && conversationOutput.selfieContext) {
              setPendingProactiveSelfie({ context: conversationOutput.selfieContext });
          }
        }
        setPendingProactiveSelfie(null);
      } else if (clientSetupStep !== 'CHAT_READY' && clientSetupStep !== 'SELECTING_VOICE') {
        let nextAiFlowStep: AiSetupStep | null = null;
        let nextClientStep: ClientSetupStep | null = null;
        let updatedSettingsDraft = { ...settingsDraft };
        let userLanguageProvider = trimmedMessage; 

        if (clientSetupStep === 'AWAITING_USER_NAME') {
          updatedSettingsDraft.userName = trimmedMessage || DEFAULT_SETTINGS_DRAFT.userName; 
          nextAiFlowStep = AI_SETUP_STEPS.ASK_PERSONALITY;
          nextClientStep = 'AWAITING_USER_PERSONALITY';
        } else if (clientSetupStep === 'AWAITING_USER_PERSONALITY') {
          updatedSettingsDraft.personalityTraits = trimmedMessage || DEFAULT_SETTINGS_DRAFT.personalityTraits; 
          nextAiFlowStep = AI_SETUP_STEPS.ASK_TOPICS;
          nextClientStep = 'AWAITING_USER_TOPICS';
        } else if (clientSetupStep === 'AWAITING_USER_TOPICS') {
          updatedSettingsDraft.topicPreferences = trimmedMessage || DEFAULT_SETTINGS_DRAFT.topicPreferences; 
          nextAiFlowStep = AI_SETUP_STEPS.ASK_VOICE_PREFERENCE;
          nextClientStep = 'AWAITING_USER_VOICE_DECISION';
        } else if (clientSetupStep === 'AWAITING_USER_VOICE_DECISION') {
            const affirmative = ['yes', 'yep', 'sure', 'ok', 'да', 'хочу', 'customize', 'choose', 'давай', 'выбрать', 'настроить'].some(kw => trimmedMessage.toLowerCase().includes(kw));
            if (affirmative) {
                setClientSetupStep('SELECTING_VOICE');
                setSetupVisualPhase('voice_selection');
                setIsAiResponding(false); 
                return; 
            } else {
                updatedSettingsDraft.selectedVoiceName = null; 
                nextAiFlowStep = AI_SETUP_STEPS.ASK_APPEARANCE;
                nextClientStep = 'AWAITING_USER_APPEARANCE';
            }
        } else if (clientSetupStep === 'AWAITING_USER_APPEARANCE') {
          updatedSettingsDraft.appearanceDescription = trimmedMessage || DEFAULT_SETTINGS_DRAFT.appearanceDescription; 
          nextAiFlowStep = AI_SETUP_STEPS.CONFIRM_GENERATION;
          nextClientStep = 'AWAITING_AI_CONFIRMATION'; 
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
            
            const finalAppearanceDescription = updatedSettingsDraft.appearanceDescription || DEFAULT_SETTINGS_DRAFT.appearanceDescription;
            if (!finalAppearanceDescription) { 
              toast({ title: "Error", description: "Appearance description is missing.", variant: "destructive" });
              setClientSetupStep('AWAITING_USER_APPEARANCE'); 
              setSetupVisualPhase('conversational_setup');
              const reAskResponse = await getSetupPrompt({ currentStep: AI_SETUP_STEPS.ASK_APPEARANCE, userName: updatedSettingsDraft.userName, userRawInput: "Please describe your appearance again."});
              addMessage({ sender: 'ai', text: reAskResponse.aiResponse });
              setIsAiResponding(false);
              return; 
            }

            const { portraits } = await generateAppearanceOptions({ appearanceDescription: finalAppearanceDescription });
            setAppearanceOptions(portraits);
            setSetupVisualPhase('appearance_selection');
            setClientSetupStep('SELECTING_AVATAR'); 
          } else if (nextClientStep) {
            setClientSetupStep(nextClientStep);
          }
        }
      } else if (appSettings && clientSetupStep === 'CHAT_READY') {
        const chatHistory = messages
          .slice(-21, -1) 
          .map(msg => `${msg.sender === 'user' ? appSettings.userName : 'AI Girlfriend'}: ${msg.text || (msg.imageUrl ? '[sent a selfie]' : '')}`)
          .join('\\n');

        const conversationOutput: ContinueConversationOutput = await continueConversation({
            lastUserMessage: trimmedMessage,
            chatHistory,
            personalityTraits: appSettings.personalityTraits,
            topicPreferences: appSettings.topicPreferences,
        });

        if (conversationOutput.responseText) {
            addMessage({ sender: 'ai', text: conversationOutput.responseText });
        }

        if (conversationOutput.decision === 'IMPLICIT_SELFIE_NOW' && conversationOutput.selfieContext) {
            await handleGenerateSelfieRequest(conversationOutput.selfieContext, appSettings, conversationOutput.responseText);
        } else if (conversationOutput.decision === 'PROACTIVE_SELFIE_OFFER' && conversationOutput.selfieContext) {
            setPendingProactiveSelfie({ context: conversationOutput.selfieContext });
        }

      } else if (clientSetupStep !== 'SELECTING_VOICE') {
         console.warn("Message sent but appSettings are null and not in CHAT_READY setup step, or in SELECTING_VOICE step.");
      }
    } catch (error: any) {
      console.error("Error during setup or conversation step:", error);
      let friendlyErrorText = "Ой, что-то пошло не так. Давай попробуем еще раз чуть позже?";
      if (error.message && error.message.includes('503') || error.message && error.message.toLowerCase().includes('overloaded')) {
        friendlyErrorText = "Уф, мои лампочки перегрелись! Мозг искусственного интеллекта сейчас очень занят. Можем попробовать еще раз через минутку? 💖";
      } else if (error.message && error.message.toLowerCase().includes('api key not valid')) {
         friendlyErrorText = "Ох, кажется, что-то не так с моим подключением к AI-сервисам. Моей команде поддержки нужно это проверить. Давай пока поговорим о чем-нибудь простом!";
      }
      addMessage({sender: 'ai', text: friendlyErrorText });

      if (clientSetupStep !== 'CHAT_READY') {
        setClientSetupStep('AWAITING_AI_GREETING');
        setMessages([]); 
        setSettingsDraft(DEFAULT_SETTINGS_DRAFT);
        setSetupVisualPhase('conversational_setup');
        setIsAiResponding(false); 
        if (!isInitializing && messages.length === 0) { 
            setIsAiResponding(true); 
            try {
                const inputForAISetup: GetSetupPromptInput = { currentStep: AI_SETUP_STEPS.INITIATE, userRawInput: initialLanguageHint };
                const response: GetSetupPromptOutput = await getSetupPrompt(inputForAISetup);
                addMessage({ sender: 'ai', text: response.aiResponse });
                setClientSetupStep('AWAITING_USER_NAME');
            } catch (e) { console.error("Error re-initiating setup after failure:", e); }
             finally { setIsAiResponding(false); }
        }
      }
    } finally {
      setIsAiResponding(false);
    }
  };

  const handleVoiceSelected = async (voiceName: string | null) => {
    setIsAiResponding(true);
    const newSettingsDraft = { ...settingsDraft, selectedVoiceName: voiceName };
    setSettingsDraft(newSettingsDraft);
  
    if (appSettings && appSettings.selectedAvatarDataUri) { 
      const updatedAppSettings: AppSettings = {
        ...appSettings,
        selectedVoiceName: voiceName,
      };
      setAppSettings(updatedAppSettings);
      
      addMessage({ sender: 'ai', text: voiceName ? `Okay, I'll use this voice from now on: ${voiceName}.` : "Alright, I'll use my default voice." });
      setClientSetupStep('CHAT_READY');
      setSetupVisualPhase('chat_ready');
      setIsAiResponding(false);
    } else { 
      setSetupVisualPhase('conversational_setup'); 
      try {
        const aiResponse = await getSetupPrompt({
          currentStep: AI_SETUP_STEPS.ASK_APPEARANCE,
          userName: newSettingsDraft.userName || DEFAULT_SETTINGS_DRAFT.userName,
          userRawInput: voiceName ? `I've selected voice: ${voiceName}` : "I'll use the default voice.",
        });
        addMessage({ sender: 'ai', text: aiResponse.aiResponse });
        setClientSetupStep('AWAITING_USER_APPEARANCE');
      } catch (error) {
        console.error("Error asking for appearance after voice selection:", error);
        toast({title: "Error", description: "Could not proceed with setup.", variant: "destructive"});
      } finally {
        setIsAiResponding(false);
      }
    }
  };

  const handleAvatarSelection = useCallback(async (selectedImageUri: string) => {
    if (isAiResponding || isGeneratingSelfie || isGeneratingPhotoshoot) return; 

    const currentDraft = settingsDraft; 

    if (!currentDraft.userName || !currentDraft.personalityTraits || !currentDraft.topicPreferences || !currentDraft.appearanceDescription) {
        toast({ title: "Setup Incomplete", description: "Some settings are missing. Please restart with /start.", variant: "destructive"});
        setClientSetupStep('AWAITING_AI_GREETING'); 
        setMessages([]);
        setSettingsDraft(DEFAULT_SETTINGS_DRAFT);
        setSetupVisualPhase('conversational_setup');
        setIsAiResponding(false);
        if (!isInitializing && messages.length === 0) {
            setIsAiResponding(true);
            try {
                const inputForAISetup: GetSetupPromptInput = { currentStep: AI_SETUP_STEPS.INITIATE, userRawInput: initialLanguageHint };
                const response: GetSetupPromptOutput = await getSetupPrompt(inputForAISetup);
                addMessage({ sender: 'ai', text: response.aiResponse });
                setClientSetupStep('AWAITING_USER_NAME');
            } catch (e) { console.error(e); } 
            finally { setIsAiResponding(false); }
        }
        return;
    }
    setIsAiResponding(true); 

    const finalAppSettings: AppSettings = {
      userName: currentDraft.userName,
      personalityTraits: currentDraft.personalityTraits,
      topicPreferences: currentDraft.topicPreferences,
      appearanceDescription: currentDraft.appearanceDescription,
      selectedVoiceName: currentDraft.selectedVoiceName !== undefined ? currentDraft.selectedVoiceName : null,
      selectedAvatarDataUri: selectedImageUri,
      autoPlayAiMessages: currentDraft.autoPlayAiMessages !== undefined ? currentDraft.autoPlayAiMessages : false,
    };
    setAppSettings(finalAppSettings); 
    setAppearanceOptions([]); 
    
    try {
      const { firstMessage } = await startConversation({
        personalityTraits: finalAppSettings.personalityTraits,
        topicPreferences: finalAppSettings.topicPreferences,
      });
      setMessages([{ sender: 'ai', text: `Great choice, ${finalAppSettings.userName}! I'm all set up. ${firstMessage}`, id: Date.now().toString() + Math.random().toString(36).substring(2,7), timestamp: Date.now() }]);
      setClientSetupStep('CHAT_READY');
      setSetupVisualPhase('chat_ready');
    } catch (error) {
      console.error("Error starting conversation after avatar selection:", error);
      toast({ title: "Error", description: "Could not start conversation.", variant: "destructive" });
      setMessages([{ sender: 'ai', text: "I'm all set with my new look, but I'm having a little trouble starting our chat. Let's try again in a moment!", id: Date.now().toString() + Math.random().toString(36).substring(2,7), timestamp: Date.now() }]);
      setClientSetupStep('CHAT_READY'); 
      setSetupVisualPhase('chat_ready');
    } finally {
      setIsAiResponding(false);
    }
  }, [settingsDraft, setAppSettings, toast, addMessage, isAiResponding, isGeneratingSelfie, isGeneratingPhotoshoot, initialLanguageHint, isInitializing ]);
  
  const handleGenerateSelfieRequest = async (selfieContext: string, currentAppSettings: AppSettings, userRequestText?: string) => {
    if (!currentAppSettings || !currentAppSettings.selectedAvatarDataUri || isGeneratingSelfie || isAiResponding || isGeneratingPhotoshoot) return;

    setIsGeneratingSelfie(true);    

    try {
      const chatHistoryForSelfie = messages
        .slice(-7) 
        .map(msg => `${msg.sender === 'user' ? currentAppSettings.userName : 'AI Girlfriend'}: ${msg.text || (msg.imageUrl ? '[sent a selfie]' : '')}`)
        .join('\\n');

      const selfieInput: GenerateSelfieInput = {
        personalityTraits: currentAppSettings.personalityTraits,
        topicPreferences: currentAppSettings.topicPreferences,
        chatHistory: chatHistoryForSelfie,
        baseImageDataUri: currentAppSettings.selectedAvatarDataUri,
        userSelfieRequestText: userRequestText || selfieContext, 
      };
      
      const result: GenerateSelfieOutput = await generateSelfie(selfieInput);

      if (result.selfieDataUri) {
        addMessage({ sender: 'ai', imageUrl: result.selfieDataUri });
      } else {
        console.error("Selfie generation failed (flow returned error):", result.error);
        addMessage({ sender: 'ai', text: "Ой, не могу сейчас прислать селфи, солнышко! Моя камера немного капризничает. Попробую чуть позже для тебя! 😉" });
      }
    } catch (error) { 
      console.error("Unexpected error in handleGenerateSelfieRequest:", error);
      addMessage({ sender: 'ai', text: "Ой, что-то совсем пошло не так с моей камерой! Попробуем в другой раз, милый? 😥" });
    } finally {
      setIsGeneratingSelfie(false);
    }
  };

  const handleGeneratePhotoshootRequest = async (description: string, baseImageDataForPhotoshoot: string, currentAppSettings: AppSettings) => {
    if (!currentAppSettings || !baseImageDataForPhotoshoot || isGeneratingPhotoshoot || isAiResponding || isGeneratingSelfie) return;

    setIsGeneratingPhotoshoot(true);
    addMessage({ sender: 'ai', text: `Присылаю фотосессию на тему: "${description}"! Это может занять некоторое время... 📸` });

    try {
      const photoshootInput: GeneratePhotoshootImagesInput = {
        userDescription: description,
        baseImageDataUri: baseImageDataForPhotoshoot,
      };
      const result: GeneratePhotoshootImagesOutput = await generatePhotoshootImages(photoshootInput);

      if (result.photoshootImages && result.photoshootImages.length > 0) {
        for (const imageUrl of result.photoshootImages) {
          addMessage({ sender: 'ai', imageUrl: imageUrl });
          await new Promise(resolve => setTimeout(resolve, 500)); 
        }
        addMessage({ sender: 'ai', text: "Фото прислала 😊" });
      } else {
        addMessage({ sender: 'ai', text: `I tried to do a photoshoot themed "${description}", but couldn't get any good shots right now. Maybe another time? ${result.error ? `(${result.error})` : ''}`});
      }
    } catch (error) {
      console.error("Unexpected error in handleGeneratePhotoshootRequest:", error);
      addMessage({ sender: 'ai', text: "Oh dear, something went wrong with the photoshoot! Let's try another time. 😥" });
    } finally {
      setIsGeneratingPhotoshoot(false);
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
        {setupVisualPhase === 'conversational_setup' && (
           <div className="h-[calc(100vh-10rem)]"> 
            <ChatWindow
              messages={messages}
              onSendMessage={handleSendMessage}
              onSelfieRequest={(userText) => {
                  if (clientSetupStep === 'CHAT_READY' && appSettings && !pendingProactiveSelfie && !isAiResponding && !isGeneratingSelfie && !isGeneratingPhotoshoot) {
                     handleGenerateSelfieRequest(userText || "User clicked the selfie button", appSettings, userText);
                  }
                }
              }
              isSendingMessage={isAiResponding || isGeneratingSelfie || isGeneratingPhotoshoot} 
              appSettings={appSettings} 
              chatInputDisabled={
                isAiResponding || 
                isGeneratingSelfie || 
                isGeneratingPhotoshoot ||
                clientSetupStep === 'SELECTING_VOICE' || 
                clientSetupStep === 'AWAITING_AI_CONFIRMATION' || 
                clientSetupStep === 'GENERATING_APPEARANCE' || 
                clientSetupStep === 'SELECTING_AVATAR' || 
                (clientSetupStep !== 'AWAITING_USER_NAME' &&
                 clientSetupStep !== 'AWAITING_USER_PERSONALITY' &&
                 clientSetupStep !== 'AWAITING_USER_TOPICS' &&
                 clientSetupStep !== 'AWAITING_USER_VOICE_DECISION' &&
                 clientSetupStep !== 'AWAITING_USER_APPEARANCE' &&
                 clientSetupStep !== 'CHAT_READY')
              }
              selfieButtonDisabled={isAiResponding || isGeneratingSelfie || isGeneratingPhotoshoot || clientSetupStep !== 'CHAT_READY' || !!pendingProactiveSelfie}
            />
          </div>
        )}
        {setupVisualPhase === 'voice_selection' && (
          <VoiceSelector 
            availableVoices={availableVoices}
            onVoiceSelected={handleVoiceSelected}
            isProcessing={isAiResponding}
            currentSelectedVoiceName={(appSettings?.selectedVoiceName !== undefined ? appSettings.selectedVoiceName : settingsDraft.selectedVoiceName) || null}
          />
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
                  onClick={() => !(isAiResponding || isGeneratingSelfie || isGeneratingPhotoshoot) && handleAvatarSelection(src)} 
                  onKeyDown={(e) => e.key === 'Enter' && !(isAiResponding || isGeneratingSelfie || isGeneratingPhotoshoot) && handleAvatarSelection(src)}
                  tabIndex={(isAiResponding || isGeneratingSelfie || isGeneratingPhotoshoot) ? -1 : 0}
                  role="button"
                  aria-label={`Select appearance option ${index + 1}`}
                >
                  <Image 
                    src={src} 
                    alt={`Appearance option ${index + 1}`} 
                    fill 
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw" 
                    style={{ objectFit: 'cover' }}
                    data-ai-hint="woman portrait" 
                    priority={index < 2} 
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <CheckCircle className="h-12 w-12 text-white/80" />
                  </div>
                </div>
              ))}
            </CardContent>
             <CardFooter className="pt-2 pb-4 text-center flex-col items-center">
              <p className="text-sm text-muted-foreground">Click an image to select it. {(isAiResponding || isGeneratingSelfie || isGeneratingPhotoshoot) && "(Processing...)"}</p>
            </CardFooter>
          </Card>
        )}
        {setupVisualPhase === 'chat_ready' && appSettings && (
          <div className="h-[calc(100vh-10rem)]">
            <ChatWindow
              messages={messages}
              onSendMessage={handleSendMessage}
              onSelfieRequest={(userText) => {
                if (appSettings && !pendingProactiveSelfie && !isAiResponding && !isGeneratingSelfie && !isGeneratingPhotoshoot) {
                  handleGenerateSelfieRequest(userText || "User clicked the selfie button", appSettings, userText);
                }
              }}
              isSendingMessage={isAiResponding || isGeneratingSelfie || isGeneratingPhotoshoot}
              appSettings={appSettings}
              chatInputDisabled={isAiResponding || isGeneratingSelfie || isGeneratingPhotoshoot || !!pendingProactiveSelfie}
              selfieButtonDisabled={isAiResponding || isGeneratingSelfie || isGeneratingPhotoshoot || !!pendingProactiveSelfie}
            />
          </div>
        )}
      </MainContainer>
    </div>
  );
}

