
export const LOCAL_STORAGE_SETTINGS_KEY = 'virtualDateAppSettings';

export interface AppSettings {
  personalityTraits: string;
  topicPreferences: string;
  userName: string;
  appearanceDescription: string; // Added for user to describe desired AI appearance
  selectedAvatarDataUri?: string | null; // Added to store the URI of the user-selected primary photo
}

export const DEFAULT_PERSONALITY_TRAITS = "friendly, caring, humorous, supportive, and a bit playful";
export const DEFAULT_TOPIC_PREFERENCES = "movies, music, hobbies, daily life, dreams, and technology";
export const DEFAULT_USERNAME = "My Love";
export const DEFAULT_APPEARANCE_DESCRIPTION = "A kind and beautiful young woman with a warm smile, long flowing brown hair, and sparkling hazel eyes. She often wears comfortable yet stylish casual clothes like soft sweaters and jeans, or sometimes a simple, elegant dress. She looks thoughtful and engaging.";

// AI_AVATAR_URL is no longer needed as avatar will be dynamic based on user selection

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text?: string;
  imageUrl?: string; // For AI selfie, as a data URI
  timestamp: number;
}

