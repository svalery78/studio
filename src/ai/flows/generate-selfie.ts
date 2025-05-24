
// src/ai/flows/generate-selfie.ts
'use server';
/**
 * @fileOverview Generates a photorealistic selfie of the AI girlfriend.
 * The AI decides the scene, clothing, and location based on its personality,
 * and considers recent chat history for location context.
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
});
export type GenerateSelfieInput = z.infer<typeof GenerateSelfieInputSchema>;

const GenerateSelfieOutputSchema = z.object({
  selfieDataUri: z
    .string()
    .describe(
      "The generated selfie image as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateSelfieOutput = z.infer<typeof GenerateSelfieOutputSchema>;

export async function generateSelfie(input: GenerateSelfieInput): Promise<GenerateSelfieOutput> {
  return generateSelfieFlow(input);
}

const sceneDescriptionPrompt = ai.definePrompt({
  name: 'generateSelfieSceneDescriptionPrompt',
  // Input schema now only needs personality and chat history for scene description
  input: { schema: GenerateSelfieInputSchema.pick({ personalityTraits: true, topicPreferences: true, chatHistory: true }) },
  output: { schema: z.object({ description: z.string().describe("A creative and detailed description of a photorealistic selfie scene (location, clothing, activity, mood) for an AI girlfriend. This description will be used to generate an image.") }) },
  prompt: `You are an AI girlfriend with the following personality: {{{personalityTraits}}}.
  {{#if topicPreferences}}The user you are chatting with enjoys: {{{topicPreferences}}}{{/if}}.

  You've decided to take a new, unique, photorealistic selfie for the user.
  Your primary goal is to invent a creative and plausible scenario for this selfie based on your personality and the user's interests.

  {{#if chatHistory}}
  Consider our recent conversation history for inspiration:
  --- CHAT HISTORY (Last few messages) ---
  {{{chatHistory}}}
  --- END CHAT HISTORY ---
  **Prioritize using a location that was clearly and recently mentioned in our chat history if it's suitable for a selfie.** If no specific, suitable location is found in the chat history, then pick a location that fits your personality.
  {{else}}
  Pick a location that fits your personality.
  {{/if}}

  Describe the scene in detail for an image generation model:
  - Where are you? (e.g., cozy cafe, sunny park, home studio, vibrant street market, scenic viewpoint, getting ready in front of a mirror. If a location from chat history is used, specify it here. If not, invent one based on your personality.)
  - What are you wearing? (Invent this based on your personality and the location.)
  - What are you doing? (e.g., smiling at the camera, holding a coffee, reading a book, mid-laugh, winking. Invent this.)
  - What's your mood? (e.g., happy, playful, thoughtful, relaxed, a bit flirty. Invent this.)

  The image MUST be photorealistic. Ensure your description guides towards a high-quality, realistic photo of you.
  Your description should be detailed enough for an image generation model to create a compelling image.
  Focus on natural poses and environments.
  Only output the scene description.`,
});

const generateSelfieFlow = ai.defineFlow(
  {
    name: 'generateSelfieFlow',
    inputSchema: GenerateSelfieInputSchema,
    outputSchema: GenerateSelfieOutputSchema,
  },
  async (input: GenerateSelfieInput) => {
    // Generate scene description based on personality, preferences, and chat history
    const scenePromptResponse = await sceneDescriptionPrompt({
      personalityTraits: input.personalityTraits,
      topicPreferences: input.topicPreferences,
      chatHistory: input.chatHistory,
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
      // Fallback if no base image is provided (should not happen in normal flow after setup)
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
    };
  }
);

