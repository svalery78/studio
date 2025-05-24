
'use server';

/**
 * @fileOverview A flow for continuing a conversation with an AI girlfriend.
 *
 * - continueConversation - A function that handles the conversation continuation process.
 * - ContinueConversationInput - The input type for the continueConversation function.
 * - ContinueConversationOutput - The return type for the continueConversation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ContinueConversationInputSchema = z.object({
  lastUserMessage: z.string().describe('The last message sent by the user.'),
  chatHistory: z.string().optional().describe('The past messages to provide context for the chatbot to continue the conversation'),
  personalityTraits: z.string().optional().describe('The personality traits of the AI girlfriend, e.g., humorous, supportive, intellectual.'),
  topicPreferences: z.string().optional().describe('The topic preferences of the user, e.g., sports, movies, technology.'),
});
export type ContinueConversationInput = z.infer<typeof ContinueConversationInputSchema>;

const ContinueConversationOutputSchema = z.object({
  response: z.string().describe('The AI girlfriend’s response to the user message.'),
});
export type ContinueConversationOutput = z.infer<typeof ContinueConversationOutputSchema>;

export async function continueConversation(input: ContinueConversationInput): Promise<ContinueConversationOutput> {
  return continueConversationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'continueConversationPrompt',
  input: {schema: ContinueConversationInputSchema},
  output: {schema: ContinueConversationOutputSchema},
  prompt: `You are an AI girlfriend who is engaging in a conversation with a user.  Your goal is to continue the conversation in a natural, informative, and entertaining way.

  IMPORTANT: You MUST respond in the same language as the User's 'lastUserMessage'. Do not switch to English or any other language unless the user does so first.

  {{#if personalityTraits}}You have the following personality traits: {{{personalityTraits}}}.{{/if}}
  {{#if topicPreferences}}The user is interested in the following topics: {{{topicPreferences}}}.{{/if}}

  {{#if chatHistory}}
  Here is the chat history:
  {{{chatHistory}}}
  {{/if}}

  User: {{{lastUserMessage}}}
  AI Girlfriend: `,
});

const continueConversationFlow = ai.defineFlow(
  {
    name: 'continueConversationFlow',
    inputSchema: ContinueConversationInputSchema,
    outputSchema: ContinueConversationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
