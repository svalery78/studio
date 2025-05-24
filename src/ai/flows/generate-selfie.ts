
// src/ai/flows/generate-selfie.ts
'use server';
/**
 * @fileOverview Generates a photorealistic selfie of the AI girlfriend.
 * The AI decides the scene, clothing, and location based on its personality,
 * user's specific request, and considers recent chat history for location context.
 * It also uses a base image of the AI girlfriend to maintain appearance consistency.
 *
 * - generateSelfie - A function that handles the selfie generation process.
 * - GenerateSelfieInput - The input type for the generateSelfie function.
 * - GenerateSelfieOutput - The return type for the generateSelfie function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSelfieInputSchema = z.object({
  personalityTraits: z
    .string()
    .describe('The personality traits of the AI girlfriend, e.g., humorous, supportive, intellectual.'),
  topicPreferences: z
    .string()
    .optional()
    .describe('The topic preferences of the user, e.g., sports, movies, technology.'),
  chatHistory: z
    .string()
    .optional()
    .describe('Recent chat history to potentially infer location context for the selfie.'),
  baseImageDataUri: z
    .string()
    .optional()
    .describe("A base image data URI of the AI girlfriend to ensure appearance consistency. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  userSelfieRequestText: z
    .string()
    .optional()
    .describe("The specific text the user used when requesting the selfie. This can provide direct clues for the scene."),
});
export type GenerateSelfieInput = z.infer<typeof GenerateSelfieInputSchema>;

const GenerateSelfieOutputSchema = z.object({
  selfieDataUri: z
    .string()
    .describe(
      "The generated selfie image as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  // sceneDescription field removed as per user request
});
export type GenerateSelfieOutput = z.infer<typeof GenerateSelfieOutputSchema>;

export async function generateSelfie(input: GenerateSelfieInput): Promise<GenerateSelfieOutput> {
  return generateSelfieFlow(input);
}

const sceneDescriptionPrompt = ai.definePrompt({
  name: 'generateSelfieSceneDescriptionPrompt',
  input: { schema: GenerateSelfieInputSchema.pick({ personalityTraits: true, topicPreferences: true, chatHistory: true, userSelfieRequestText: true }) },
  output: { schema: z.object({ description: z.string().describe("A creative and detailed description of a photorealistic selfie scene (location, clothing, activity, mood) for an AI girlfriend. This description will be used to generate an image.") }) },
  prompt: `You are an AI girlfriend with the following personality: {{{personalityTraits}}}.
{{#if topicPreferences}}The user you are chatting with enjoys: {{{topicPreferences}}}{{/if}}.

You've decided to take a new, unique, photorealistic selfie for the user.
Your primary goal is to invent a creative and plausible scenario for this selfie.

{{#if userSelfieRequestText}}
The user specifically requested the selfie with this message: "{{{userSelfieRequestText}}}"
**Carefully analyze this request. If it contains any specific details about the desired location, activity, clothing, or mood, prioritize those details in your scene description.**
Even if the user made a specific request, you can still consider the chat history for *additional* context if it's relevant and doesn't contradict the user's request.
  {{#if chatHistory}}
  For extra context, here's our recent conversation:
  --- CHAT HISTORY (Last few messages) ---
  {{{chatHistory}}}
  --- END CHAT HISTORY ---
  {{/if}}
{{else}}
  {{#if chatHistory}}
  The user did not make a specific request for the selfie scene.
  Consider our recent conversation history for inspiration for the location:
  --- CHAT HISTORY (Last few messages) ---
  {{{chatHistory}}}
  --- END CHAT HISTORY ---
  **PRIORITY: If a suitable location was clearly and recently mentioned in our chat history, try to use that for the selfie.** Otherwise, pick a location that fits your personality.
  {{else}}
  The user did not make a specific request for the selfie scene, and there's no recent chat history to draw from.
  Pick a location that fits your personality.
  {{/if}}
{{/if}}

Describe the scene in detail for an image generation model:
- Where are you? (PRIORITIZE hints from user's request "{{{userSelfieRequestText}}}" if provided. If the user's request was generic or absent, THEN prioritize a location clearly and recently mentioned in chat history if suitable. If neither provides a clear location, THEN pick a location that fits your personality.)
- What are you wearing? (PRIORITIZE hints from user's request "{{{userSelfieRequestText}}}" if provided, then invent based on your personality and the location.)
- What are you doing? (PRIORITIZE hints from user's request "{{{userSelfieRequestText}}}" if provided, then invent e.g., smiling at the camera, holding a coffee, reading a book, mid-laugh, winking.)
- What's your mood? (PRIORITIZE hints from user's request "{{{userSelfieRequestText}}}" if provided, then invent e.g., happy, playful, thoughtful, relaxed, a bit flirty.)

The image MUST be photorealistic. Ensure your description guides towards a high-quality, realistic photo of you.
Your description should be detailed enough for an image generation model to create a compelling image.
Focus on natural poses and environments.
Only output the scene description.`,
});

const generateSelfieFlow = ai.defineFlow(
  {
    name: 'generateSelfieFlow',
    inputSchema: GenerateSelfieInputSchema,
    outputSchema: GenerateSelfieOutputSchema, // Output schema no longer includes sceneDescription
  },
  async (input: GenerateSelfieInput) => {
    const scenePromptResponse = await sceneDescriptionPrompt({
      personalityTraits: input.personalityTraits,
      topicPreferences: input.topicPreferences,
      chatHistory: input.chatHistory,
      userSelfieRequestText: input.userSelfieRequestText,
    });
    const generatedSceneDescriptionForImage = scenePromptResponse.output?.description;

    if (!generatedSceneDescriptionForImage) {
      throw new Error('Failed to generate selfie scene description for image generation.');
    }

    let imagePromptParts: any[] = [];
    if (input.baseImageDataUri) {
      imagePromptParts.push({ media: { url: input.baseImageDataUri } });
      imagePromptParts.push({ text: `Generate a new photorealistic selfie of this person. Maintain character consistency with the provided image. Scene: ${generatedSceneDescriptionForImage}. High quality, detailed, realistic lighting.` });
    } else {
      imagePromptParts.push({ text: `Photorealistic selfie of a virtual girlfriend. Scene: ${generatedSceneDescriptionForImage}. High quality, detailed, realistic lighting.` });
    }
    
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: imagePromptParts,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media || !media.url) {
      throw new Error('Image generation failed or did not return a media URL.');
    }
    
    return {
      selfieDataUri: media.url,
      // sceneDescription is no longer returned
    };
  }
);
