
'use server';
/**
 * @fileOverview Generates 5 distinct photorealistic images for a photoshoot session.
 * The AI uses a base image of the AI girlfriend to maintain appearance consistency
 * and a user-provided description to set the theme of the photoshoot.
 *
 * - generatePhotoshootImages - A function that handles the photoshoot generation process.
 * - GeneratePhotoshootImagesInput - The input type for the function.
 * - GeneratePhotoshootImagesOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePhotoshootImagesInputSchema = z.object({
  userDescription: z
    .string()
    .describe('A textual description from the user defining the theme and context of the photoshoot.'),
  baseImageDataUri: z
    .string()
    .describe("A base image data URI of the AI girlfriend to ensure appearance consistency across all photoshoot images. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type GeneratePhotoshootImagesInput = z.infer<typeof GeneratePhotoshootImagesInputSchema>;

const GeneratePhotoshootImagesOutputSchema = z.object({
  photoshootImages: z
    .array(z.string())
    .min(1) // Expect at least one image, ideally 5
    .describe(
      "An array of generated photoshoot images as data URIs. Each string should be in the format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  error: z.string().optional().describe("An error message if the photoshoot generation failed significantly.")
});
export type GeneratePhotoshootImagesOutput = z.infer<typeof GeneratePhotoshootImagesOutputSchema>;

export async function generatePhotoshootImages(
  input: GeneratePhotoshootImagesInput
): Promise<GeneratePhotoshootImagesOutput> {
  return generatePhotoshootImagesFlow(input);
}

// This prompt generates 5 distinct image generation prompts for the photoshoot
const photoshootPromptsGenerator = ai.definePrompt({
  name: 'generatePhotoshootPrompts',
  input: { schema: GeneratePhotoshootImagesInputSchema.pick({userDescription: true}) },
  output: { schema: z.object({
    imagePrompts: z.array(z.string()).length(5).describe("Five distinct, detailed image generation prompts for a photorealistic photoshoot based on the user's theme. Each prompt should describe a slightly different pose, angle, expression, or minor variation in context, while ensuring the AI girlfriend's appearance (from a base image) is maintained.")
  })},
  prompt: `You are an expert photoshoot director for an AI girlfriend.
The user wants a photoshoot themed: "{{{userDescription}}}".

Your task is to generate 5 distinct and detailed text prompts that will be used by an image generation model.
Each prompt MUST result in a photorealistic image.
The AI girlfriend's core appearance (face, hair color, etc.) will be maintained by providing a base image to the image generator separately, so your prompts should focus on the scene, pose, clothing (if not detailed by user, make it consistent with the theme and base image), expression, and lighting to create variety.

Example theme: "relaxing at home in a cozy sweater"
Possible distinct prompts:
1.  "Photorealistic shot: AI girlfriend, smiling softly, curled up on a plush sofa with a book, warm sunlight filtering through a nearby window. Focus on a relaxed, intimate mood. She's wearing a cream-colored cozy knit sweater."
2.  "Photorealistic shot: AI girlfriend, looking directly at the camera with a gentle, happy expression, holding a steaming mug of tea, sitting by a fireplace. Cozy home background. She's in her comfy sweater."
3.  "Photorealistic shot: AI girlfriend, captured in a candid moment, laughing while looking slightly off-camera, perhaps at a pet just out of frame. Interior scene, soft lighting. Still in the cozy sweater."
4.  "Photorealistic shot: AI girlfriend, a slightly wider angle showing her in a comfortable armchair, legs tucked under her, engrossed in a tablet. Bookshelves in the background. The cozy sweater is key."
5.  "Photorealistic shot: AI girlfriend, a close-up portrait emphasizing her serene expression, with a hint of the cozy sweater's texture around her shoulders. Soft, natural lighting."

Based on the user's theme "{{{userDescription}}}", generate 5 such distinct prompts.
`,
});

const generatePhotoshootImagesFlow = ai.defineFlow(
  {
    name: 'generatePhotoshootImagesFlow',
    inputSchema: GeneratePhotoshootImagesInputSchema,
    outputSchema: GeneratePhotoshootImagesOutputSchema,
  },
  async (input: GeneratePhotoshootImagesInput): Promise<GeneratePhotoshootImagesOutput> => {
    let generatedImagePrompts: string[];

    try {
      const { output: promptsOutput } = await photoshootPromptsGenerator({ userDescription: input.userDescription });
      if (!promptsOutput || promptsOutput.imagePrompts.length !== 5) {
        console.error('Failed to generate 5 distinct image prompts for photoshoot.');
        return { photoshootImages: [], error: 'Could not prepare varied scenes for the photoshoot.' };
      }
      generatedImagePrompts = promptsOutput.imagePrompts;
    } catch (e) {
      console.error('Error generating photoshoot scene prompts:', e);
      return { photoshootImages: [], error: 'Error preparing photoshoot scenes.' };
    }

    const photoshootImages: string[] = [];
    for (const imagePromptText of generatedImagePrompts) {
      try {
        const imagePromptParts: any[] = [
            { media: { url: input.baseImageDataUri } },
            { text: `Generate a new photorealistic image for a photoshoot. **It is crucial to depict the person from the provided base image (maintaining their hair color, facial features, etc.).** Scene details: ${imagePromptText}. Ensure the image is high quality, detailed, with realistic lighting.` }
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
          console.warn('One image in photoshoot failed to generate or did not return a URL.');
          // Optionally, push a placeholder or skip, here we skip.
        }
      } catch (e) {
        console.warn('Exception during one image generation in photoshoot:', e);
        // Optionally, log and continue to try and generate other images.
      }
    }
    
    if (photoshootImages.length === 0) {
        return { photoshootImages: [], error: "Failed to generate any images for the photoshoot."}
    }

    return { photoshootImages };
  }
);
