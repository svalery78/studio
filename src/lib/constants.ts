
export const LOCAL_STORAGE_SETTINGS_KEY = 'virtualDateAppSettings';

export interface AppSettings {
  personalityTraits: string;
  topicPreferences: string;
  userName: string;
  appearanceDescription: string;
  selectedAvatarDataUri?: string | null;
  selectedVoiceName?: string | null;
  autoPlayAiMessages: boolean; // Added for auto-playback setting
}

export const DEFAULT_PERSONALITY_TRAITS = "friendly, caring, humorous, supportive, and a bit playful";
export const DEFAULT_TOPIC_PREFERENCES = "movies, music, hobbies, daily life, dreams, and technology";
export const DEFAULT_USERNAME = "My Love";
export const DEFAULT_APPEARANCE_DESCRIPTION = "A kind and beautiful young woman with a warm smile, long flowing brown hair, and sparkling hazel eyes. She often wears comfortable yet stylish casual clothes like soft sweaters and jeans, or sometimes a simple, elegant dress. She looks thoughtful and engaging.";
export const DEFAULT_SELECTED_VOICE_NAME = null;


export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text?: string;
  imageUrl?: string;
  timestamp: number;
}

// Default values for the setup draft
export const DEFAULT_SETTINGS_DRAFT: Omit<AppSettings, 'selectedAvatarDataUri'> = {
  userName: DEFAULT_USERNAME,
  personalityTraits: DEFAULT_PERSONALITY_TRAITS,
  topicPreferences: DEFAULT_TOPIC_PREFERENCES,
  appearanceDescription: DEFAULT_APPEARANCE_DESCRIPTION,
  selectedVoiceName: DEFAULT_SELECTED_VOICE_NAME,
  autoPlayAiMessages: false, // Default to off
};

