
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-selfie.ts';
import '@/ai/flows/continue-conversation.ts';
import '@/ai/flows/start-conversation.ts';
import '@/ai/flows/generate-appearance-options.ts';
import '@/ai/flows/get-setup-prompt.ts'; // Added new flow for conversational setup

