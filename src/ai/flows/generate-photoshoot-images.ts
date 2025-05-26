
'use server';
/**
 * @fileOverview Generates 5 distinct photorealistic images for a photoshoot session
 * based on a user's textual description. A base image of the AI girlfriend is used
 * to maintain character appearance consistency across the generated images.
 *
 * - generatePhotoshootImages - A function that handles the photoshoot generation process.
 * - GeneratePhotoshootImagesInput - The input type for the function.
 * - GeneratePhotoshootImagesOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';

const GeneratePhotoshootImagesInputSchema = z.object({
  userDescription: z
    .string()
    .describe('A textual description from the user defining the theme or scene for the photoshoot. This will be used to generate 5 distinct image prompts.'),
  baseImageDataUri: z
    .string()
    .describe("A base image data URI of the AI girlfriend. This image is crucial for maintaining appearance consistency of the person across all generated photoshoot images. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type GeneratePhotoshootImagesInput = z.infer<typeof GeneratePhotoshootImagesInputSchema>;

const GeneratePhotoshootImagesOutputSchema = z.object({
  photoshootImages: z
    .array(z.string())
    .min(1) // Expect at least one image, ideally 5
    .describe(
      "An array of 5 generated photoshoot images as data URIs. Each string should be in the format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  error: z.string().optional().describe("An error message if the photoshoot generation failed significantly.")
});
export type GeneratePhotoshootImagesOutput = z.infer<typeof GeneratePhotoshootImagesOutputSchema>;

export async function generatePhotoshootImages(
  input: GeneratePhotoshootImagesInput
): Promise<GeneratePhotoshootImagesOutput> {
  return generatePhotoshootImagesFlow(input);
}

// Helper prompt to generate 5 varied, detailed scene prompts for the image model,
// based on a single user description.
const photoshootScenePromptsGenerator = ai.definePrompt({
  name: 'generatePhotoshootScenePrompts',
  input: { schema: GeneratePhotoshootImagesInputSchema.pick({ userDescription: true }) },
  output: { schema: z.object({
    scenePrompts: z.array(z.string()).length(5).describe("Five distinct, detailed image generation prompts. Each prompt should describe a complete photorealistic scene based on the user's input description, suitable for generating a unique image. The person in these scenes should be the AI girlfriend whose appearance is defined by a separate base image.")
  })},
  prompt: `Based on the following user description for a photoshoot, generate 5 distinct and detailed text prompts. Each prompt will be used to generate one photorealistic image of an AI girlfriend (whose appearance will be based on a separate reference image). The prompts should describe varied scenes, poses, or activities related to the user's core theme.

User's Photoshoot Description: "{{{userDescription}}}"

For each of the 5 prompts, imagine a complete scene. Describe:
- The setting/location.
- The AI girlfriend's activity or pose within that setting.
- Her mood or expression.
- Any relevant objects or minor characters.
- The desired lighting or atmosphere.

Ensure each of the 5 prompts is unique and will lead to a visually distinct image, while still being thematically connected to the user's original description. Each prompt should be a self-contained instruction for an image generation model.

Example output for userDescription "relaxing at a cozy cabin":
1. "Photorealistic image: AI girlfriend reading a book by a warm fireplace inside a rustic log cabin, soft evening light, content smile."
2. "Photorealistic image: AI girlfriend sipping hot cocoa on the porch of a snowy cabin, looking out at a winter forest, bundled in a cozy sweater."
3. "Photorealistic image: AI girlfriend laughing as she plays a board game with an unseen partner in a brightly lit cabin living room."
4. "Photorealistic image: AI girlfriend stretching by a window in a cabin bedroom, morning light streaming in, peaceful expression."
5. "Photorealistic image: AI girlfriend writing in a journal at a wooden desk in a cabin, surrounded by books, thoughtful mood."

Generate 5 such distinct scene prompts.
`,
});

const generatePhotoshootImagesFlow = ai.defineFlow(
  {
    name: 'generatePhotoshootImagesFlow',
    inputSchema: GeneratePhotoshootImagesInputSchema,
    outputSchema: GeneratePhotoshootImagesOutputSchema,
  },
  async (input: GeneratePhotoshootImagesInput): Promise<GeneratePhotoshootImagesOutput> => {
    let generatedScenePrompts: string[];

    try {
      const { output: scenePromptsOutput } = await photoshootScenePromptsGenerator({
        userDescription: input.userDescription,
      });
      if (!scenePromptsOutput || scenePromptsOutput.scenePrompts.length !== 5) {
        console.error('Failed to generate 5 distinct scene prompts for photoshoot.');
        return { photoshootImages: [], error: 'Could not prepare varied scenes for the photoshoot.' };
      }
      generatedScenePrompts = scenePromptsOutput.scenePrompts;
    } catch (e: any) {
      console.error('Error generating photoshoot scene prompts:', e.message);
      return { photoshootImages: [], error: `Error preparing photoshoot scenes: ${e.message}` };
    }

    const photoshootImages: string[] = [];
    for (const scenePrompt of generatedScenePrompts) {
      try {
        // The scenePrompt already contains "Photorealistic image: ..."
        const imagePromptText = `Ensure the person in the image (face, hair, body type) strictly matches the person from the provided base media. Scene: ${scenePrompt}. Ensure high quality, detailed, and realistic lighting.`;
        
        const imagePromptParts: any[] = [
            { media: { url: input.baseImageDataUri } },
            { text: imagePromptText }
        ];

        const {media} = await ai.generate({
          model: 'googleai/gemini-2.0-flash-exp',
          prompt: imagePromptParts,
          config: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        });

        if (media && media.url) {
          photoshootImages.push(media.url);
        } else {
          console.warn('One image in photoshoot failed to generate or did not return a URL. Scene: ', scenePrompt);
        }
      } catch (e: any) {
        console.warn(`Exception during one image generation in photoshoot for scene "${scenePrompt}":`, e.message);
        // Optionally, add a placeholder or skip this image
      }
    }

    if (photoshootImages.length === 0) {
        return { photoshootImages: [], error: "Failed to generate any images for the photoshoot. This might be due to issues with the base image, the user description, or restrictive content filters."}
    }

    return { photoshootImages };
  }
);

