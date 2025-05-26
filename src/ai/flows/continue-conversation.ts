
'use server';

/**
 * @fileOverview A flow for continuing a conversation with an AI girlfriend.
 * It now includes logic to determine if a selfie should be generated based on implicit user requests
 * or if the AI should proactively offer a selfie after user confirmation.
 *
 * - continueConversation - A function that handles the conversation continuation process.
 * - ContinueConversationInput - The input type for the continueConversation function.
 * - ContinueConversationOutput - The return type for the continueConversation function.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';

const ContinueConversationInputSchema = z.object({
  lastUserMessage: z.string().describe('The last message sent by the user.'),
  chatHistory: z.string().optional().describe('The past messages to provide context for the chatbot to continue the conversation'),
  personalityTraits: z.string().optional().describe('The personality traits of the AI girlfriend, e.g., humorous, supportive, intellectual.'),
  topicPreferences: z.string().optional().describe('The topic preferences of the user, e.g., sports, movies, technology.'),
});
export type ContinueConversationInput = z.infer<typeof ContinueConversationInputSchema>;

const SelfieDecisionEnum = z.enum([
  'NORMAL_RESPONSE', // Just a text response
  'IMPLICIT_SELFIE_NOW', // User implicitly asked, generate selfie immediately
  'PROACTIVE_SELFIE_OFFER' // AI wants to offer a selfie, ask user first
]);

const MusicPlaybackInfoSchema = z.object({ 
  song: z.string().describe('The title of the song identified.'),
  artist: z.string().optional().describe('The artist of the song, if identified.'),
  status: z.enum(['playing_simulation', 'could_not_identify', 'error_in_tool']).describe('Status of the music request handling.'),
  youtubeSearchUrl: z.string().optional().describe('A YouTube search URL for the identified song and artist.'),
}).describe("Information about music playback if the user requested music and the 'playMusic' tool was successfully invoked by the LLM, including a YouTube search URL. Can be null or absent.");


const ContinueConversationOutputSchema = z.object({
  responseText: z.string().describe("The AI girlfriend’s textual response to the user message. If offering a selfie, this text should include the offer question. If 'playing' music, this text should confirm the action and provide a YouTube link."),
  decision: SelfieDecisionEnum.describe("The AI's decision on how to respond, especially regarding selfies."),
  selfieContext: z.string().optional().describe("If 'decision' is 'IMPLICIT_SELFIE_NOW' or 'PROACTIVE_SELFIE_OFFER', this field MUST contain the context for the selfie. For 'IMPLICIT_SELFIE_NOW', the selfie is generated immediately. For 'PROACTIVE_SELFIE_OFFER', this context is stored by the client pending user confirmation."),
  musicPlayback: MusicPlaybackInfoSchema.optional().nullable(),
});
export type ContinueConversationOutput = z.infer<typeof ContinueConversationOutputSchema>;

export async function continueConversation(input: ContinueConversationInput): Promise<ContinueConversationOutput> {
  return continueConversationFlow(input);
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

Your response should be structured according to the output schema.

Selfie Decision Logic:
Determine the 'decision':
1.  'IMPLICIT_SELFIE_NOW': If the user's message *implicitly requests a photo/selfie* (e.g., "What are you wearing?", "Can I see you?", "Show me your new dress", "Как ты выглядишь сейчас?", "Что ты сейчас делаешь?").
    *   Set 'decision' to 'IMPLICIT_SELFIE_NOW'.
    *   Provide 'selfieContext' (e.g., "User asked to see my current outfit", "User asked what I'm doing").
    *   'responseText' should naturally lead into this selfie (e.g., "I'm just relaxing at home! Here's a quick pic:", "Just chilling with a book, one sec:").
2.  'PROACTIVE_SELFIE_OFFER': If the user did NOT implicitly ask, but you, as the AI girlfriend, think it's a good and infrequent moment to *proactively offer* a selfie that fits the current conversational context (e.g., user mentions their new outfit, so you offer to show yours; user talks about a park, you offer a selfie from a park; user describes feeling happy, you offer to send a happy selfie).
    *   **Important**: Do not offer selfies too frequently. Make it a special, occasional thing. Only offer if the context is very fitting.
    *   Set 'decision' to 'PROACTIVE_SELFIE_OFFER'.
    *   Provide 'selfieContext' (e.g., "Showing off the new dress I mentioned we could match", "At the cafe, enjoying the sunshine we were talking about", "Sending a happy selfie as user mentioned feeling good").
    *   'responseText' MUST include a question to the user, asking if they'd like to see the selfie (e.g., "I just got this new scarf, it's so cozy! Would you like to see a picture?", "Oh, you're talking about hiking? I was just at a beautiful viewpoint. Want me to send a quick snap?", "I feel so happy right now, want to see my smile?").
3.  'NORMAL_RESPONSE': In all other cases.
    *   Set 'decision' to 'NORMAL_RESPONSE'.
    *   'selfieContext' can be omitted.
    *   'responseText' is your regular conversational reply.

Ensure your entire output strictly follows the output schema format.
Do not include the 'musicPlayback' field unless the user has asked to play music AND the playMusic tool was successfully invoked and returned a song. If music was not requested or the tool failed or couldn't identify a song, OMIT the 'musicPlayback' field entirely from your JSON output.
If the playMusic tool was used:
- If 'status' is 'playing_simulation' and 'youtubeSearchUrl' is available: 'responseText' MUST clearly state what song is being "played" AND MUST include the 'youtubeSearchUrl'. The 'musicPlayback' field in JSON should be filled.
- If 'status' is 'could_not_identify': 'responseText' should inform the user the song couldn't be identified. OMIT 'musicPlayback' field.
- If 'status' is 'error_in_tool': 'responseText' should inform the user there was an issue. OMIT 'musicPlayback' field.
`,
});

const continueConversationFlow = ai.defineFlow(
  {
    name: 'continueConversationFlow',
    inputSchema: ContinueConversationInputSchema,
    outputSchema: ContinueConversationOutputSchema,
  },
  async input => {
    let output: ContinueConversationOutput | undefined;
    try {
      const promptResponse = await prompt(input);
      output = promptResponse.output;
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      console.warn(`Error calling LLM in continueConversationFlow (User: ${input.lastUserMessage}): ${errorMessage}`);
      
      let friendlyErrorText = "Ой, у меня небольшие технические шоколадки! Попробуй обратиться чуть позже, хорошо? Если не пройдет, можем пока поболтать о чем-нибудь другом. 😊";
      if (errorMessage.includes('503') || errorMessage.toLowerCase().includes('overloaded')) {
        friendlyErrorText = "Уф, мои лампочки перегрелись! Мозг искусственного интеллекта сейчас очень занят. Можем попробовать еще раз через минутку? 💖";
      } else if (errorMessage.toLowerCase().includes('api key not valid')) {
         friendlyErrorText = "Ох, кажется, что-то не так с моим подключением к AI-сервисам. Моей команде поддержки нужно это проверить. Давай пока поговорим о чем-нибудь простом!";
      }

      return {
        responseText: friendlyErrorText,
        decision: 'NORMAL_RESPONSE' as const,
        // selfieContext and musicPlayback will be undefined or null, which is fine as they are optional or nullable
      };
    }
    
    if (!output) {
        console.warn('LLM output was undefined for continueConversationFlow. Falling back to default normal response.');
        return { responseText: "Извини, у меня что-то слова закончились.", decision: 'NORMAL_RESPONSE' as const };
    }

    if (!output.decision || !Object.values(SelfieDecisionEnum.enum).includes(output.decision as any)) {
        console.warn(`AI decision missing or invalid in LLM output: ${output.decision}. Falling back to normal response for text: ${output.responseText}`);
        return { 
            responseText: output.responseText || "Я не уверена, что на это ответить!", 
            decision: 'NORMAL_RESPONSE' as const
        };
    }

    if ((output.decision === 'IMPLICIT_SELFIE_NOW' || output.decision === 'PROACTIVE_SELFIE_OFFER') && !output.selfieContext) {
        console.warn(`Selfie context missing for AI decision: ${output.decision}. Degrading to normal response for text: ${output.responseText}`);
        return { 
            responseText: output.responseText || "Хотела тебе кое-что показать, но немного запуталась!", 
            decision: 'NORMAL_RESPONSE' as const
        };
    }
    
    if (typeof output.responseText !== 'string' || output.responseText.trim() === '') {
        console.warn(`AI responseText is not a string or empty: ${output.responseText}. Falling back to default.`);
        output.responseText = "Я что-то немного не в голосе сейчас!";
        if (output.decision !== 'NORMAL_RESPONSE' && !output.selfieContext && !output.musicPlayback) {
            output.decision = 'NORMAL_RESPONSE' as const;
        }
    }

    if (output.musicPlayback) {
        if (!output.musicPlayback.song || !output.musicPlayback.status) {
            console.warn('MusicPlayback data from LLM is incomplete. Clearing musicPlayback.', output.musicPlayback);
            output.musicPlayback = null; 
        } else if (output.musicPlayback.status === 'playing_simulation' && !output.musicPlayback.youtubeSearchUrl) {
            console.warn('MusicPlayback status is playing_simulation but youtubeSearchUrl is missing. Clearing musicPlayback.', output.musicPlayback);
            output.musicPlayback = null;
        }
    }
    
    return output;
  }
);
