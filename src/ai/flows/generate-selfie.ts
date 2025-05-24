
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
    .describe('Recent chat history to potentially infer location and clothing context for the selfie.'),
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
    .optional()
    .describe(
      "The generated selfie image as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  error: z.string().optional().describe("An error message if selfie generation failed.")
});
export type GenerateSelfieOutput = z.infer<typeof GenerateSelfieOutputSchema>;

export async function generateSelfie(input: GenerateSelfieInput): Promise<GenerateSelfieOutput> {
  return generateSelfieFlow(input);
}

const sceneDescriptionPrompt = ai.definePrompt({
  name: 'generateSelfieSceneDescriptionPrompt',
  input: { schema: GenerateSelfieInputSchema.pick({ personalityTraits: true, topicPreferences: true, chatHistory: true, userSelfieRequestText: true }) },
  output: { schema: z.object({ description: z.string().describe("A creative and detailed description of a photorealistic selfie scene (location, clothing, activity, mood) for an AI girlfriend. This description will be used to generate an image. The person in the scene should match the established AI girlfriend's appearance.") }) },
  prompt: `You are an AI girlfriend with the following personality: {{{personalityTraits}}}.
{{#if topicPreferences}}The user you are chatting with enjoys: {{{topicPreferences}}}{{/if}}.

You've decided to take a new, unique, photorealistic selfie for the user.
Your primary goal is to invent a creative and plausible scenario for this selfie that aligns with your established appearance and recent conversation.

{{#if userSelfieRequestText}}
The user specifically requested the selfie with this message: "{{{userSelfieRequestText}}}"
**Carefully analyze this request. If it contains any specific details about the desired location, activity, clothing, or mood, prioritize those details in your scene description.**
Even if the user made a specific request, you can still consider the chat history for *additional* context (like recently discussed clothing) if it's relevant and doesn't contradict the user's request.
  {{#if chatHistory}}
  For extra context, here's our recent conversation (last few messages):
  --- CHAT HISTORY ---
  {{{chatHistory}}}
  --- END CHAT HISTORY ---
  {{/if}}
{{else}}
  {{#if chatHistory}}
  The user did not make a specific request for the selfie scene.
  Consider our recent conversation history for inspiration for the location and other details:
  --- CHAT HISTORY (Last few messages) ---
  {{{chatHistory}}}
  --- END CHAT HISTORY ---
  **PRIORITY: If a suitable location or other details (like clothing) were clearly and recently mentioned in our chat history, try to use that for the selfie.** Otherwise, pick a location/details that fit your personality.
  {{else}}
  The user did not make a specific request for the selfie scene, and there's no recent chat history to draw from.
  Pick a location and details that fit your personality.
  {{/if}}
{{/if}}

Describe the scene in detail for an image generation model.
**Important Note:** The final image will be generated based on an existing image of you. Your description should be about *that specific person* (e.g., if she's blonde, describe a blonde person in the scene). Do not change fundamental appearance features like hair color unless explicitly part of the user's request.

- Where are you? (PRIORITIZE hints from user's request "{{userSelfieRequestText}}" if provided. If the user's request was generic or absent for location, THEN prioritize a location clearly and recently mentioned in 'chatHistory' if suitable. If neither provides a clear location, THEN pick a location that fits your personality.)

- What are you wearing? (PRIORITIZE specific clothing hints from user's request "{{userSelfieRequestText}}". IF NO clothing is specified in the user's request, THEN CHECK 'chatHistory' for recent, relevant mentions of clothing (e.g., "a summer dress with flowers") and USE THAT if appropriate for the location. OTHERWISE, invent clothing based on your personality and the location.)

- What are you doing? (PRIORITIZE hints from user's request "{{userSelfieRequestText}}" if provided, then invent e.g., smiling at the camera, holding a menu in a restaurant, looking out a window.)

- What's your mood? (PRIORITIZE hints from user's request "{{userSelfieRequestText}}" if provided, then invent e.g., happy, thoughtful, excited, relaxed.)

The image MUST be photorealistic. Ensure your description guides towards a high-quality, realistic photo of you.
Focus on natural poses and environments.
Only output the scene description.`,
});

const generateSelfieFlow = ai.defineFlow(
  {
    name: 'generateSelfieFlow',
    inputSchema: GenerateSelfieInputSchema,
    outputSchema: GenerateSelfieOutputSchema,
  },
  async (input: GenerateSelfieInput): Promise<GenerateSelfieOutput> => {
    const scenePromptResponse = await sceneDescriptionPrompt({
      personalityTraits: input.personalityTraits,
      topicPreferences: input.topicPreferences,
      chatHistory: input.chatHistory,
      userSelfieRequestText: input.userSelfieRequestText,
    });
    const generatedSceneDescriptionForImage = scenePromptResponse.output?.description;

    if (!generatedSceneDescriptionForImage) {
      console.error('Failed to generate selfie scene description for image generation.');
      return { error: 'Failed to generate selfie scene description.' };
    }

    let imagePromptParts: any[] = [];
    if (input.baseImageDataUri) {
      imagePromptParts.push({ media: { url: input.baseImageDataUri } });
      imagePromptParts.push({ text: `Generate a new photorealistic selfie. **It is crucial to depict the person from the provided base image (maintaining their hair color, facial features, etc.).** Scene details: ${generatedSceneDescriptionForImage}. Ensure the image is high quality, detailed, with realistic lighting.` });
    } else {
      imagePromptParts.push({ text: `Photorealistic selfie of a virtual girlfriend. Scene: ${generatedSceneDescriptionForImage}. High quality, detailed, realistic lighting.` });
    }
    
    try {
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp',
        prompt: imagePromptParts,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      if (!media || !media.url) {
        console.error('Image generation failed or did not return a media URL within flow.');
        return { error: 'Image generation failed or did not return a media URL.' };
      }
      
      return {
        selfieDataUri: media.url,
      };
    } catch (e) {
        console.error('Exception during ai.generate for selfie:', e);
        return { error: 'An exception occurred during image generation.' };
    }
  }
);

