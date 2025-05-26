
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

// This prompt now focuses *only* on generating descriptions of VARIATIONS.
// The main flow will handle the instruction to match the base image's outfit/environment.
const photoshootVariationPromptsGenerator = ai.definePrompt({
  name: 'generatePhotoshootVariationPrompts',
  input: { schema: GeneratePhotoshootImagesInputSchema.pick({ userDescription: true }) }, // Base image is implicitly handled by the main flow
  output: { schema: z.object({
    variationDescriptions: z.array(z.string()).length(5).describe("Five distinct, concise descriptions of *variations* for a photoshoot. Each description should detail a new pose, camera angle, facial expression, or minor action. Assume the person, their outfit, and the core environment REMAIN THE SAME as in a base image (which you don't need to describe). If userDescription is provided, try to incorporate it naturally into the variations.")
  })},
  prompt: `You are an expert photoshoot director.
Your task is to generate 5 distinct and concise descriptions of *variations* for a photoshoot.
Assume the AI girlfriend's appearance, her **exact outfit**, and the **core environment/location** REMAIN THE SAME as in a base image that will be provided separately to the image model.
Your descriptions should focus ONLY on the *changes* or *specifics* for each of the 5 shots.

Describe variations in:
- Camera angle (e.g., "close-up shot focusing on her face", "medium shot from a slightly lower angle", "shot from above showing more of the background").
- Pose (e.g., "looking over her shoulder towards the camera", "hands on hips, confident stance", "leaning against a wall thoughtfully", "playfully adjusting her hair").
- Facial expression (e.g., "a warm, gentle smile", "a playful wink", "a thoughtful, serene expression", "laughing heartily").
- Minor, contextually relevant actions or added details.

{{#if userDescription}}
An optional user request for the photoshoot is: "{{{userDescription}}}"
Try to incorporate this user request naturally into one or more of your 5 variation descriptions if it's compatible with an implicit base scene. For example, if userDescription is 'holding a book', a variation could be 'sitting and reading the book, looking content'. If userDescription is 'happy mood', ensure expressions reflect that.
{{else}}
No specific user request provided. Focus on diverse poses, angles, and expressions.
{{/if}}

**IMPORTANT: Do NOT describe the person's general appearance, their outfit, or the main environment in your output. Only describe the *variation* for each shot.**

Example of one good variation description: "Smiling warmly towards the camera, medium shot."
Another example (if userDescription was 'eating an ice cream cone'): "Happily eating an ice cream cone, close-up on her face."
Another example: "Looking off to the side thoughtfully, with a gentle breeze blowing her hair. Close-up."

Output 5 distinct variation descriptions. Each should be a concise phrase.
`,
});

const generatePhotoshootImagesFlow = ai.defineFlow(
  {
    name: 'generatePhotoshootImagesFlow',
    inputSchema: GeneratePhotoshootImagesInputSchema,
    outputSchema: GeneratePhotoshootImagesOutputSchema,
  },
  async (input: GeneratePhotoshootImagesInput): Promise<GeneratePhotoshootImagesOutput> => {
    let generatedVariationDescriptions: string[];

    try {
      const { output: variationsOutput } = await photoshootVariationPromptsGenerator({
        userDescription: input.userDescription,
        // baseImageDataUri is not directly passed to this prompt, as it focuses on variations
      });
      if (!variationsOutput || variationsOutput.variationDescriptions.length !== 5) {
        console.error('Failed to generate 5 distinct variation descriptions for photoshoot.');
        return { photoshootImages: [], error: 'Could not prepare varied scenes for the photoshoot.' };
      }
      generatedVariationDescriptions = variationsOutput.variationDescriptions;
    } catch (e: any) {
      console.error('Error generating photoshoot variation descriptions:', e.message);
      return { photoshootImages: [], error: `Error preparing photoshoot scenes: ${e.message}` };
    }

    const photoshootImages: string[] = [];
    for (const variationDesc of generatedVariationDescriptions) {
      try {
        const imagePromptText = `Photorealistic image. The person's appearance (face, hair, body type), THEIR EXACT OUTFIT, AND THE EXACT ENVIRONMENT/LOCATION must strictly match those in the provided base media. For this shot: ${variationDesc}. Ensure high quality, detailed, and realistic lighting.`;
        
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
          console.warn('One image in photoshoot failed to generate or did not return a URL. Variation: ', variationDesc);
        }
      } catch (e: any) {
        console.warn(`Exception during one image generation in photoshoot for variation "${variationDesc}":`, e.message);
      }
    }

    if (photoshootImages.length === 0) {
        return { photoshootImages: [], error: "Failed to generate any images for the photoshoot. This might be due to issues with the base image or restrictive content filters."}
    }

    return { photoshootImages };
  }
);

