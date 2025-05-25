
'use server';

/**
 * @fileOverview A flow for continuing a conversation with an AI girlfriend.
 * It now includes logic to determine if a selfie should be generated based on implicit user requests
 * or if the AI should proactively offer a selfie after user confirmation.
 * It also handles music playback requests using a tool, providing a YouTube search link.
 *
 * - continueConversation - A function that handles the conversation continuation process.
 * - ContinueConversationInput - The input type for the continueConversation function.
 * - ContinueConversationOutput - The return type for the continueConversation function.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';
import { playMusicTool, PlayMusicOutputSchema } from '@/ai/tools/play-music-tool';

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

const MusicPlaybackInfoSchema = PlayMusicOutputSchema.pick({ song: true, artist: true, status: true, youtubeSearchUrl: true })
  .describe("Information about music playback if the user requested music and the 'playMusic' tool was successfully invoked by the LLM, including a YouTube search URL.");

const ContinueConversationOutputSchema = z.object({
  responseText: z.string().describe("The AI girlfriend’s textual response to the user message. If offering a selfie, this text should include the offer question. If 'playing' music, this text should confirm the action and provide a YouTube link."),
  decision: SelfieDecisionEnum.describe("The AI's decision on how to respond, especially regarding selfies."),
  selfieContext: z.string().optional().describe("If 'decision' is 'IMPLICIT_SELFIE_NOW' or 'PROACTIVE_SELFIE_OFFER', this field MUST contain the context for the selfie. For 'IMPLICIT_SELFIE_NOW', the selfie is generated immediately. For 'PROACTIVE_SELFIE_OFFER', this context is stored by the client pending user confirmation."),
  musicPlayback: MusicPlaybackInfoSchema.optional().nullable().describe("Information about music playback if the user requested music. This field should be populated if the 'playMusic' tool was successfully invoked by the LLM, including a YouTube search URL. It can be null or omitted if no music interaction occurred."),
});
export type ContinueConversationOutput = z.infer<typeof ContinueConversationOutputSchema>;

export async function continueConversation(input: ContinueConversationInput): Promise<ContinueConversationOutput> {
  return continueConversationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'continueConversationPrompt',
  input: {schema: ContinueConversationInputSchema},
  output: {schema: ContinueConversationOutputSchema},
  tools: [playMusicTool],
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

Music Request Handling:
If the user's message asks to play music, a song, or an artist (e.g., "play some jazz", "can you play 'Bohemian Rhapsody'?", "put on Taylor Swift"), you MUST use the 'playMusic' tool to identify the song/artist and get a YouTube search URL.
- After the tool returns its result (song, artist, status, youtubeSearchUrl):
  - If 'status' is 'playing_simulation' and 'youtubeSearchUrl' is provided: Your 'responseText' is the MOST IMPORTANT part for the user. It MUST confirm playback and include the YouTube link directly. For example: "Конечно! Вот ссылка на YouTube для '[SONG_NAME_FROM_TOOL]' от '[ARTIST_FROM_TOOL]': [YOUTUBE_URL_FROM_TOOL] Ты можешь послушать ее там." or "Нашла! Вот ссылка, чтобы послушать '[SONG_NAME_FROM_TOOL]' (исполнитель '[ARTIST_FROM_TOOL]') на YouTube: [YOUTUBE_URL_FROM_TOOL]". You MUST also populate the 'musicPlayback' field in your output with the 'song', 'artist', 'status', and 'youtubeSearchUrl' from the tool's result.
  - If 'status' is 'could_not_identify': Your 'responseText' should inform the user, like "Я не совсем поняла, какую песню ты хочешь. Можешь повторить?" or "Хм, не удалось найти. Что бы ты хотел послушать?". You MUST populate the 'musicPlayback' field in your output with the 'song' (e.g., 'Unknown Song'), 'artist' (if any), and 'status: could_not_identify' from the tool's result.
  - If 'status' is 'error_in_tool': Your 'responseText' should inform the user that there was an issue searching for the music, e.g., "Прости, солнышко, что-то пошло не так при поиске музыки. Попробуешь еще раз?". You MUST populate the 'musicPlayback' field with the 'song' (e.g., 'Unknown Song'), 'artist' (if any), and 'status: error_in_tool'.
- If no music was requested or processed in this turn, the 'musicPlayback' field should be null or omitted entirely from the output.

Selfie Decision Logic (if not primarily a music request):
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
3.  'NORMAL_RESPONSE': In all other cases (including when primarily handling a music request unless it also implies a selfie).
    *   Set 'decision' to 'NORMAL_RESPONSE'.
    *   'selfieContext' can be omitted.
    *   'responseText' is your regular conversational reply.

Ensure your entire output strictly follows the output schema format.
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
        console.warn('LLM output was undefined for continueConversationFlow. Falling back to default normal response.');
        return { responseText: "Sorry, I'm a bit lost for words right now.", decision: 'NORMAL_RESPONSE' as const };
    }

    if (output.musicPlayback === null) {
        output.musicPlayback = undefined; 
    }

    if (!output.decision || !Object.values(SelfieDecisionEnum.enum).includes(output.decision as any)) {
        console.warn(`AI decision missing or invalid in LLM output: ${output.decision}. Falling back to normal response for text: ${output.responseText}`);
        return { 
            responseText: output.responseText || "I'm not sure what to say to that!", 
            decision: 'NORMAL_RESPONSE' as const,
            musicPlayback: output.musicPlayback 
        };
    }

    if ((output.decision === 'IMPLICIT_SELFIE_NOW' || output.decision === 'PROACTIVE_SELFIE_OFFER') && !output.selfieContext) {
        console.warn(`Selfie context missing for AI decision: ${output.decision}. Degrading to normal response for text: ${output.responseText}`);
        return { 
            responseText: output.responseText || "I wanted to show you something, but I got a bit muddled!", 
            decision: 'NORMAL_RESPONSE' as const,
            musicPlayback: output.musicPlayback 
        };
    }
    
    if (typeof output.responseText !== 'string' || output.responseText.trim() === '') {
        console.warn(`AI responseText is not a string or empty: ${output.responseText}. Falling back to default.`);
        output.responseText = "I'm a bit tongue-tied at the moment!";
        if (output.decision !== 'NORMAL_RESPONSE' && !output.selfieContext && !output.musicPlayback) {
            output.decision = 'NORMAL_RESPONSE' as const;
        }
    }
    
    if (output.musicPlayback) { 
        if (typeof output.musicPlayback.song !== 'string' || 
            !output.musicPlayback.status || 
            !Object.values(PlayMusicOutputSchema.shape.status.enum).includes(output.musicPlayback.status as any)) {
            console.warn('MusicPlayback data from LLM is malformed (missing song, status, or invalid status). Clearing musicPlayback field.', output.musicPlayback);
            output.musicPlayback = undefined;
        } else if (output.musicPlayback.status === 'playing_simulation' && typeof output.musicPlayback.youtubeSearchUrl !== 'string') {
            console.warn('MusicPlayback data from LLM is malformed (missing youtubeSearchUrl for playing_simulation). Clearing musicPlayback field.', output.musicPlayback);
            output.musicPlayback = undefined;
        }
        // If status is 'could_not_identify' or 'error_in_tool', youtubeSearchUrl is not strictly required by the tool's schema.
        // The prompt instructs the LLM what to do in these cases for responseText.
    }

    return output;
  }
);

