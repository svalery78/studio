// src/ai/flows/generate-selfie.ts
'use server';
/**
 * @fileOverview Generates a photorealistic selfie of the AI girlfriend.
 * The AI decides the scene, clothing, and location based on its personality.
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
});
export type GenerateSelfieInput = z.infer<typeof GenerateSelfieInputSchema>;

const GenerateSelfieOutputSchema = z.object({
  selfieDataUri: z
    .string()
    .describe(
      "The generated selfie image as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  sceneDescription: z
    .string()
    .describe('A description of the selfie scene, including location, clothing, and mood, as narrated by the AI girlfriend.'),
});
export type GenerateSelfieOutput = z.infer<typeof GenerateSelfieOutputSchema>;

export async function generateSelfie(input: GenerateSelfieInput): Promise<GenerateSelfieOutput> {
  return generateSelfieFlow(input);
}

const sceneDescriptionPrompt = ai.definePrompt({
  name: 'generateSelfieSceneDescriptionPrompt',
  input: { schema: GenerateSelfieInputSchema },
  output: { schema: z.object({ description: z.string().describe("A creative and detailed description of a photorealistic selfie scene (location, clothing, activity, mood) for an AI girlfriend. This description will be used to generate an image.") }) },
  prompt: `You are an AI girlfriend with the following personality: {{{personalityTraits}}}.
  {{#if topicPreferences}}The user you are chatting with enjoys: {{{topicPreferences}}}{{/if}}.

  You've decided to take a new, unique, photorealistic selfie for the user.
  Invent a creative and plausible scenario for this selfie.
  Describe the scene in detail for an image generation model:
  - Where are you? (e.g., cozy cafe, sunny park, home studio, vibrant street market, scenic viewpoint, getting ready in front of a mirror)
  - What are you wearing? (e.g., casual chic, sporty, elegant, comfy loungewear, a favorite dress)
  - What are you doing? (e.g., smiling at the camera, holding a coffee, reading a book, mid-laugh, winking)
  - What's your mood? (e.g., happy, playful, thoughtful, relaxed, a bit flirty)

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
    const scenePromptResponse = await sceneDescriptionPrompt(input);
    const generatedSceneDescriptionForImage = scenePromptResponse.output?.description;

    if (!generatedSceneDescriptionForImage) {
      throw new Error('Failed to generate selfie scene description.');
    }

    const imagePromptText = `Photorealistic selfie of a virtual girlfriend. Scene: ${generatedSceneDescriptionForImage}. High quality, detailed, realistic lighting.`;

    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: imagePromptText,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media || !media.url) {
      throw new Error('Image generation failed or did not return a media URL.');
    }
    
    // Craft a more conversational description for the chat
    const conversationalSceneDescription = `Just took this for you! 😉\nI'm ${generatedSceneDescriptionForImage.toLowerCase().startsWith('in') || generatedSceneDescriptionForImage.toLowerCase().startsWith('at') ? '' : 'currently '}${generatedSceneDescriptionForImage.charAt(0).toLowerCase() + generatedSceneDescriptionForImage.slice(1)}`;


    return {
      selfieDataUri: media.url,
      sceneDescription: conversationalSceneDescription,
    };
  }
);
