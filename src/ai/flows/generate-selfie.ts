// src/ai/flows/generate-selfie.ts
'use server';
/**
 * @fileOverview Generates a selfie-style image of the AI girlfriend based on the user's prompt with a specific style and location.
 *
 * - generateSelfie - A function that handles the selfie generation process.
 * - GenerateSelfieInput - The input type for the generateSelfie function.
 * - GenerateSelfieOutput - The return type for the generateSelfie function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSelfieInputSchema = z.object({
  style: z
    .string()
    .describe("The style of the selfie (e.g., 'anime', 'realistic', 'sketch')."),
  location: z
    .string()
    .optional()
    .describe("The location where the selfie is taken (e.g., 'at the beach', 'in a cafe')."),
});
export type GenerateSelfieInput = z.infer<typeof GenerateSelfieInputSchema>;

const GenerateSelfieOutputSchema = z.object({
  selfieDataUri: z
    .string()
    .describe(
      "The generated selfie image as a data URI that includes a MIME type and uses Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateSelfieOutput = z.infer<typeof GenerateSelfieOutputSchema>;

export async function generateSelfie(input: GenerateSelfieInput): Promise<GenerateSelfieOutput> {
  return generateSelfieFlow(input);
}

// This prompt object definition is kept for potential future use or different generation strategies.
// Currently, the generateSelfieFlow directly calls ai.generate for image modality.
const selfieGenerationPromptDefinition = ai.definePrompt({
  name: 'generateSelfiePromptObject', // Renamed to avoid confusion
  input: {schema: GenerateSelfieInputSchema},
  output: {schema: GenerateSelfieOutputSchema}, // This output schema implies text containing a data URI
  prompt: `Generate a selfie of a virtual girlfriend in the style of {{{style}}}{{#if location}} at {{{location}}}{{/if}}. The selfie should be in a data URI format.`,
});

const generateSelfieFlow = ai.defineFlow(
  {
    name: 'generateSelfieFlow',
    inputSchema: GenerateSelfieInputSchema,
    outputSchema: GenerateSelfieOutputSchema,
  },
  async (input: GenerateSelfieInput) => {
    let promptText = `Generate a selfie of a virtual girlfriend in the style of ${input.style}`;
    if (input.location && input.location.trim() !== '') {
      promptText += ` at ${input.location.trim()}`;
    }
    promptText += `.`;

    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: promptText,
      config: {
        responseModalities: ['TEXT', 'IMAGE'], // MUST provide both TEXT and IMAGE, IMAGE only won't work
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
