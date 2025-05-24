
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-selfie.ts';
import '@/ai/flows/continue-conversation.ts';
import '@/ai/flows/start-conversation.ts';
import '@/ai/flows/generate-appearance-options.ts'; // Added new flow
