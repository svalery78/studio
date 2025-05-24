
'use server';
/**
 * @fileOverview Generates multiple photorealistic portrait options for the AI girlfriend.
 *
 * - generateAppearanceOptionsFlow - A function that handles the portrait generation.
 * - GenerateAppearanceOptionsInput - The input type for the function.
 * - GenerateAppearanceOptionsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAppearanceOptionsInputSchema = z.object({
  appearanceDescription: z
    .string()
    .describe(
      'A detailed textual description of the desired appearance for the AI girlfriend. This will be used to generate portrait options.'
    ),
});
export type GenerateAppearanceOptionsInput = z.infer<typeof GenerateAppearanceOptionsInputSchema>;

const GenerateAppearanceOptionsOutputSchema = z.object({
  portraits: z
    .array(z.string())
    .length(4)
    .describe(
      "An array of 4 generated portrait images as data URIs. Each string should be in the format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateAppearanceOptionsOutput = z.infer<typeof GenerateAppearanceOptionsOutputSchema>;

export async function generateAppearanceOptions(
  input: GenerateAppearanceOptionsInput
): Promise<GenerateAppearanceOptionsOutput> {
  return generateAppearanceOptionsFlow(input);
}

// This is a helper prompt to generate varied prompts for the image model,
// ensuring 4 distinct options from a single user description.
const imagePromptRefinement = ai.definePrompt({
  name: 'refineAppearancePromptForMultipleOptions',
  input: { schema: GenerateAppearanceOptionsInputSchema },
  output: { schema: z.object({
    refinedPrompts: z.array(z.string()).length(4).describe("Four distinct, detailed image generation prompts based on the user's initial description, each emphasizing slightly different aspects or interpretations to ensure visual variety for portrait options. Each prompt should aim for a photorealistic portrait.")
  })},
  prompt: `Based on the following user description of their desired AI girlfriend, generate 4 distinct and detailed prompts suitable for an image generation model. Each prompt should lead to a unique photorealistic portrait. Emphasize subtle variations in pose, expression, lighting, or minor details while adhering to the core description.

User's Appearance Description:
"{{{appearanceDescription}}}"

Generate 4 image generation prompts. Each prompt should be a complete instruction for generating one photorealistic portrait.
Example of a good prompt structure: "Photorealistic portrait of a woman with [details from user description]. She has [specific expression, e.g., a gentle smile]. The lighting is [e.g., soft and natural]. Close-up shot focusing on her face and shoulders."
Ensure each of the 4 prompts you generate will result in a visually distinct option.
`,
});


const generateAppearanceOptionsFlow = ai.defineFlow(
  {
    name: 'generateAppearanceOptionsFlow',
    inputSchema: GenerateAppearanceOptionsInputSchema,
    outputSchema: GenerateAppearanceOptionsOutputSchema,
  },
  async (input: GenerateAppearanceOptionsInput) => {
    const { output: refinedPromptsOutput } = await imagePromptRefinement(input);
    if (!refinedPromptsOutput || refinedPromptsOutput.refinedPrompts.length !== 4) {
      throw new Error('Failed to generate varied image prompts.');
    }

    const imagePromises = refinedPromptsOutput.refinedPrompts.map(async (imagePrompt) => {
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp',
        prompt: imagePrompt, // Use the refined prompt
        config: {
          responseModalities: ['TEXT', 'IMAGE'], // Must include TEXT even if only IMAGE is used
        },
      });
      if (!media || !media.url) {
        throw new Error('Image generation failed for one of the options.');
      }
      return media.url;
    });

    const portraits = await Promise.all(imagePromises);
    
    return {
      portraits,
    };
  }
);

