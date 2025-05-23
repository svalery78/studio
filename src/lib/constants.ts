export const LOCAL_STORAGE_SETTINGS_KEY = 'virtualDateAppSettings';

export interface AppSettings {
  personalityTraits: string;
  topicPreferences: string;
  userName: string;
}

export const DEFAULT_PERSONALITY_TRAITS = "friendly, caring, humorous, supportive, and a bit playful";
export const DEFAULT_TOPIC_PREFERENCES = "movies, music, hobbies, daily life, dreams, and technology";
export const DEFAULT_USERNAME = "My Love";

export const SELFIE_STYLES = [
  { value: 'realistic', label: 'Realistic' },
  { value: 'anime', label: 'Anime' },
  { value: 'sketch', label: 'Sketch' },
  { value: 'pixel_art', label: 'Pixel Art' },
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'cyberpunk', label: 'Cyberpunk' },
];

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text?: string;
  imageUrl?: string; // For AI selfie, as a data URI
  timestamp: number;
  style?: string; // For selfie requests
}
