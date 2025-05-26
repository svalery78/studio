
'use server';
/**
 * @fileOverview Generates 5 distinct photorealistic images for a photoshoot session.
 * The AI analyzes a base image of the AI girlfriend (for appearance, clothing, environment)
 * and uses an optional user-provided description to modify or enhance the scene.
 * The goal is to create 5 variations of the scene from the base image.
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
    .optional()
    .describe('An optional textual description from the user to modify or add context to the photoshoot scene derived from the base image.'),
  baseImageDataUri: z
    .string()
    .describe("A base image data URI of the AI girlfriend. This image is crucial as it defines the primary appearance, clothing, and environment for the photoshoot. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
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
  name: 'generatePhotoshootPromptsFromBaseImage',
  input: { schema: GeneratePhotoshootImagesInputSchema },
  output: { schema: z.object({
    imagePrompts: z.array(z.string()).length(5).describe("Five distinct, detailed image generation prompts. Each prompt must explicitly state that the AI girlfriend's appearance, clothing, and environment are based on the baseImageDataUri, and then introduce a specific variation in pose, angle, expression, or minor detail. User_description, if provided and compatible, should be integrated into the variation.")
  })},
  prompt: `You are an expert photoshoot director for an AI girlfriend.
You will be given:
1. A base image of the AI girlfriend: {{media url=baseImageDataUri}}
   This base image is CRITICAL. You must carefully analyze it to understand:
   - Her core appearance (face, hair, body type).
   - Her **current clothing**.
   - The **current environment/location**.
2. An optional user description/modifier for the photoshoot: "{{#if userDescription}}{{{userDescription}}}{{else}}No specific modifier provided by the user.{{/if}}"

Your task is to generate 5 distinct and detailed text prompts for an image generation model.
These prompts MUST result in photorealistic images that are **variations or continuations of the scene depicted in the base image**.

Each of your 5 generated prompts must be a complete instruction for generating one photorealistic image and MUST follow this structure:

1.  Start with: "Photorealistic image of the AI girlfriend. Her appearance (face, hair, and body type) **must strictly match the person in the base image provided**."
2.  Continue with: "She is wearing the **EXACT SAME OUTFIT** as seen in the base image. She is in the **EXACT SAME ENVIRONMENT/LOCATION** as seen in the base image." (Do not invent new clothing or locations here; refer to what is visible in the base image).
3.  Then, describe the VARIATION for this specific shot: "[Describe a different camera angle (e.g., close-up, medium shot, from above), a different pose (e.g., looking over her shoulder, hands on hips), a different facial expression (e.g., smiling, thoughtful, laughing), or a minor, contextually relevant action or added detail. If userDescription ('{{{userDescription}}}') is provided and compatible with the base scene, integrate it here as part of the variation. For example, if userDescription is 'holding a book' and the base image is her in a park, the variation could be 'She is now holding a book and reading it, with a thoughtful expression. Medium shot.']."
4.  **IMPORTANT**: Do NOT change the core outfit or overall environment from the base image unless the userDescription explicitly asks for a *very minor, compatible* alteration that can be added to the existing scene (e.g., 'wearing a hat' if the base image is outdoors and a hat makes sense; 'holding a flower' if appropriate). If userDescription suggests a major incompatible change (e.g., base image is 'beach bikini', user says 'in a winter coat in the snow'), you MUST IGNORE the userDescription for outfit/location and focus on varying pose/expression/angle within the original scene from the base image. The goal is a photoshoot of the *original scene*.

Example of one output prompt (assuming base image is girl with brown hair, red dress, outdoor cafe):
"Photorealistic image of the AI girlfriend. Her appearance (face, hair, and body type) **must strictly match the person in the base image provided**. She is wearing the **EXACT SAME OUTFIT** (red summer dress) as seen in the base image. She is in the **EXACT SAME ENVIRONMENT/LOCATION** (outdoor cafe table) as seen in the base image. For this shot, she is smiling warmly towards the camera, and the camera angle is a slightly lower medium shot."

Output 5 distinct prompts structured like the example above, ensuring each describes a unique variation.
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
      const { output: promptsOutput } = await photoshootPromptsGenerator({
        userDescription: input.userDescription,
        baseImageDataUri: input.baseImageDataUri
      });
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
        // imagePromptText now comes from photoshootPromptsGenerator and should be very explicit
        // about matching the base image's person, outfit, and environment, then adding a variation.
        const imagePromptParts: any[] = [
            { media: { url: input.baseImageDataUri } },
            { text: `${imagePromptText}. **Crucially, the person's appearance (face, hair, body type), THEIR OUTFIT, AND THE ENVIRONMENT/LOCATION must strictly match those in the provided base media, except for the specific variation described in this prompt.** The image should be high quality, detailed, with realistic lighting.` }
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
        }
      } catch (e) {
        console.warn('Exception during one image generation in photoshoot:', e);
      }
    }

    if (photoshootImages.length === 0) {
        return { photoshootImages: [], error: "Failed to generate any images for the photoshoot."}
    }

    return { photoshootImages };
  }
);

