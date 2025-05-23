'use server';

/**
 * @fileOverview A flow for starting a conversation with an AI girlfriend with a personalized message.
 *
 * - startConversation - A function that initiates the conversation with a personalized message.
 * - StartConversationInput - The input type for the startConversation function.
 * - StartConversationOutput - The return type for the startConversation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const StartConversationInputSchema = z.object({
  personalityTraits: z
    .string()
    .describe(
      'Description of the AI girlfriend personality traits (e.g., humorous, supportive, intellectual).'
    ),
  topicPreferences: z
    .string()
    .describe(
      'The users topic preferences to steer conversations and interactions with AI girlfriend.'
    ),
});
export type StartConversationInput = z.infer<typeof StartConversationInputSchema>;

const StartConversationOutputSchema = z.object({
  firstMessage: z
    .string()
    .describe('The first message from the AI girlfriend to start the conversation.'),
});
export type StartConversationOutput = z.infer<typeof StartConversationOutputSchema>;

export async function startConversation(input: StartConversationInput): Promise<StartConversationOutput> {
  return startConversationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'startConversationPrompt',
  input: {schema: StartConversationInputSchema},
  output: {schema: StartConversationOutputSchema},
  prompt: `You are an AI girlfriend who is starting a conversation with a new user. Your goal is to initiate the conversation with an interesting and personalized message to make it feel more natural and engaging.

  Consider these personality traits: {{{personalityTraits}}}
  And these topic preferences from the user: {{{topicPreferences}}}

  Compose the first message to the user:
  `,
});

const startConversationFlow = ai.defineFlow(
  {
    name: 'startConversationFlow',
    inputSchema: StartConversationInputSchema,
    outputSchema: StartConversationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
