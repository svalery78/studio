
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-selfie.ts';
import '@/ai/flows/continue-conversation.ts';
import '@/ai/flows/start-conversation.ts';
import '@/ai/flows/generate-appearance-options.ts';
import '@/ai/flows/get-setup-prompt.ts'; // Added new flow for conversational setup
import '@/ai/flows/generate-photoshoot-images.ts'; // Added new flow for photoshoot
// Removed music tool import

