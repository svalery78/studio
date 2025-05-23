// src/ai/flows/generate-selfie.ts
'use server';
/**
 * @fileOverview Generates a selfie-style image of the AI girlfriend based on the user's prompt with a specific style.
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

const prompt = ai.definePrompt({
  name: 'generateSelfiePrompt',
  input: {schema: GenerateSelfieInputSchema},
  output: {schema: GenerateSelfieOutputSchema},
  prompt: `Generate a selfie of a virtual girlfriend in the style of {{{style}}}. The selfie should be in a data URI format.`, // the prompt should ask for the response to be a data URI
});

const generateSelfieFlow = ai.defineFlow(
  {
    name: 'generateSelfieFlow',
    inputSchema: GenerateSelfieInputSchema,
    outputSchema: GenerateSelfieOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: `Generate a selfie of a virtual girlfriend in the style of ${input.style}.`, // The prompt passed to the ai.generate function
      config: {
        responseModalities: ['TEXT', 'IMAGE'], // MUST provide both TEXT and IMAGE, IMAGE only won't work
      },
    });

    return {
      selfieDataUri: media.url!,
    };
  }
);
