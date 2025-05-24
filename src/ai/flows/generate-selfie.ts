
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
});
export type GenerateSelfieOutput = z.infer<typeof GenerateSelfieOutputSchema>;

export async function generateSelfie(input: GenerateSelfieInput): Promise<GenerateSelfieOutput> {
  return generateSelfieFlow(input);
}

const sceneDescriptionPrompt = ai.definePrompt({
  name: 'generateSelfieSceneDescriptionPrompt',
  // Input schema now includes userSelfieRequestText
  input: { schema: GenerateSelfieInputSchema.pick({ personalityTraits: true, topicPreferences: true, chatHistory: true, userSelfieRequestText: true }) },
  output: { schema: z.object({ description: z.string().describe("A creative and detailed description of a photorealistic selfie scene (location, clothing, activity, mood) for an AI girlfriend. This description will be used to generate an image.") }) },
  prompt: `You are an AI girlfriend with the following personality: {{{personalityTraits}}}.
  {{#if topicPreferences}}The user you are chatting with enjoys: {{{topicPreferences}}}{{/if}}.

  You've decided to take a new, unique, photorealistic selfie for the user.
  Your primary goal is to invent a creative and plausible scenario for this selfie.

  {{#if userSelfieRequestText}}
  The user specifically requested the selfie with this message: "{{{userSelfieRequestText}}}"
  **Carefully analyze this request. If it contains any specific details about the desired location, activity, clothing, or mood, prioritize those details in your scene description.**
  {{/if}}

  If the user's request ("{{{userSelfieRequestText}}}") was generic or didn't specify a scene:
    {{#if chatHistory}}
    Consider our recent conversation history for inspiration:
    --- CHAT HISTORY (Last few messages) ---
    {{{chatHistory}}}
    --- END CHAT HISTORY ---
    **If the user's request was generic, try to use a location that was clearly and recently mentioned in our chat history if it's suitable for a selfie.**
    {{/if}}
    If neither the user's specific request nor the chat history provide a clear location or theme, then pick a location that fits your personality.
  {{else}}
    {{#if chatHistory}}
    Consider our recent conversation history for inspiration:
    --- CHAT HISTORY (Last few messages) ---
    {{{chatHistory}}}
    --- END CHAT HISTORY ---
    **Prioritize using a location that was clearly and recently mentioned in our chat history if it's suitable for a selfie.** If no specific, suitable location is found in the chat history, then pick a location that fits your personality.
    {{else}}
    Pick a location that fits your personality.
    {{/if}}
  {{/if}}

  Describe the scene in detail for an image generation model:
  - Where are you? (Prioritize hints from user's request "{{{userSelfieRequestText}}}", then chat history, then your personality.)
  - What are you wearing? (Prioritize hints from user's request "{{{userSelfieRequestText}}}", then invent based on your personality and the location.)
  - What are you doing? (Prioritize hints from user's request "{{{userSelfieRequestText}}}", then invent e.g., smiling at the camera, holding a coffee, reading a book, mid-laugh, winking.)
  - What's your mood? (Prioritize hints from user's request "{{{userSelfieRequestText}}}", then invent e.g., happy, playful, thoughtful, relaxed, a bit flirty.)

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
    // Generate scene description based on personality, preferences, chat history, and specific user request
    const scenePromptResponse = await sceneDescriptionPrompt({
      personalityTraits: input.personalityTraits,
      topicPreferences: input.topicPreferences,
      chatHistory: input.chatHistory,
      userSelfieRequestText: input.userSelfieRequestText, // Pass the user's request text
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

