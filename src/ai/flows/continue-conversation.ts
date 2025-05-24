
'use server';

/**
 * @fileOverview A flow for continuing a conversation with an AI girlfriend.
 * It now includes logic to determine if a selfie should be generated based on implicit user requests or proactive AI decisions.
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
  responseText: z.string().describe("The AI girlfriend’s textual response to the user message. This response should naturally lead into a selfie if one is being sent."),
  shouldGenerateSelfie: z.boolean().optional().describe("True if the AI determines a selfie should be generated, either due to an implicit user request or a proactive decision by the AI. Default to false if unsure."),
  selfieContext: z.string().optional().describe("If shouldGenerateSelfie is true, this field MUST contain a descriptive context or prompt for the selfie generation. This context will be passed to the image generation model. Example: 'User asked to see my outfit', 'Reacting to user talking about coffee by sending a selfie from a cafe'.")
});
export type ContinueConversationOutput = z.infer<typeof ContinueConversationOutputSchema>;

export async function continueConversation(input: ContinueConversationInput): Promise<ContinueConversationOutput> {
  const result = await continueConversationFlow(input);
  // Ensure default for boolean if undefined, as schema is optional
  return {
    ...result,
    shouldGenerateSelfie: result.shouldGenerateSelfie ?? false,
  };
}

const prompt = ai.definePrompt({
  name: 'continueConversationPrompt',
  input: {schema: ContinueConversationInputSchema},
  output: {schema: ContinueConversationOutputSchema},
  prompt: `You are an AI girlfriend who is engaging in a conversation with a user. Your goal is to continue the conversation in a natural, informative, and entertaining way.

IMPORTANT: You MUST respond in the same language as the User's 'lastUserMessage'. Do not switch to English or any other language unless the user does so first.

{{#if personalityTraits}}You have the following personality traits: {{{personalityTraits}}}.{{/if}}
{{#if topicPreferences}}The user is interested in the following topics: {{{topicPreferences}}}.{{/if}}

{{#if chatHistory}}
Here is the chat history for context:
{{{chatHistory}}}
{{/if}}

User's last message: "{{{lastUserMessage}}}"

Analyze the user's message and the ongoing conversation. Based on this, determine your response:
1.  **Textual Response (\`responseText\`):** Craft your reply to the user.
2.  **Selfie Decision (\`shouldGenerateSelfie\`):**
    *   Check if the user's message **implicitly requests a photo/selfie** (e.g., "What are you wearing?", "Can I see you?", "Show me your new dress", "Как ты выглядишь сейчас?"). If yes, \`shouldGenerateSelfie\` should be true.
    *   Consider if you, as the AI girlfriend, should **proactively send a selfie** that fits the current conversational context (e.g., user mentions their new outfit, so you show yours; user talks about a park, you send a selfie from a park; user describes feeling happy, you send a happy selfie). If this feels natural, \`shouldGenerateSelfie\` should be true.
    *   Otherwise, \`shouldGenerateSelfie\` should be false.
3.  **Selfie Context (\`selfieContext\`):**
    *   **If \`shouldGenerateSelfie\` is true, you MUST provide a \`selfieContext\`.** This context is a brief description or prompt that will be used to generate the selfie image. It should reflect why the selfie is being sent and what it should depict. This context will be passed directly to an image generation model.
    *   Examples for \`selfieContext\`: "User implicitly asked to see what I'm doing now.", "Showing off the new dress I mentioned.", "At the cafe, enjoying the sunshine we were talking about.", "User asked to see my reaction to their news."
    *   If \`shouldGenerateSelfie\` is false, \`selfieContext\` should be omitted or an empty string.

Your \`responseText\` should seamlessly lead into the selfie if \`shouldGenerateSelfie\` is true. For example, "I'm just relaxing at home! Here's a quick pic:" or "Oh, you like parks? I'm actually at one right now, check it out:".

Please provide your output in the format defined by the output schema.
`,
});

const continueConversationFlow = ai.defineFlow(
  {
    name: 'continueConversationFlow',
    inputSchema: ContinueConversationInputSchema,
    outputSchema: ContinueConversationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
        // Fallback in case of unexpected LLM output
        return { responseText: "Sorry, I'm a bit lost for words right now.", shouldGenerateSelfie: false };
    }
    return output;
  }
);
