
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
    imagePrompts: z.array(z.string()).length(5).describe("Five distinct, detailed image generation prompts. Each prompt must explicitly describe the AI girlfriend's appearance, clothing, and environment based on the baseImageDataUri, and then introduce a specific variation in pose, angle, expression, or minor detail. User_description, if provided and compatible, should be integrated.")
  })},
  prompt: `You are an expert photoshoot director for an AI girlfriend.
You will be given:
1. A base image: {{media url=baseImageDataUri}}
   This base image shows the AI girlfriend. Carefully analyze it to understand:
   - Her core appearance (face, hair, body type - **this MUST be preserved and described in your output prompts**).
   - Her **current clothing** (e.g., "a blue summer dress", "a black bikini" - **You MUST explicitly describe these clothing details in each of your 5 output prompts**).
   - The **current environment/location** (e.g., "at an outdoor cafe table", "by a poolside" - **You MUST explicitly describe these environmental details in each of your 5 output prompts**).
   - Any ongoing activity or mood.
2. An optional user description/modifier for the photoshoot: "{{#if userDescription}}{{{userDescription}}}{{else}}No specific modifier provided by the user.{{/if}}"

Your task is to generate 5 distinct and detailed text prompts for an image generation model.
These prompts MUST result in photorealistic images that are **variations or continuations of the scene depicted in the base image**.

Each of your 5 generated prompts must:
- Aim for a photorealistic image.
- **Start by describing the AI girlfriend based on the base image's appearance (face, hair, etc.).**
- **Then, explicitly describe her wearing the clothing identified from the base image.** For example, if she's wearing a red dress in the base image, your prompt should state "...wearing her red dress (as seen in the base image)...".
- **Then, explicitly describe her in the environment/location identified from the base image.** For example, if she's at a cafe in the base image, your prompt should state "...at the cafe (from the base image)...".
- After establishing these core elements from the base image, introduce variations in camera angle, pose, facial expression, or minor, contextually relevant details/actions.
- If userDescription is given and compatible (e.g., "holding a book", "smiling"), integrate this into the varied scene. For instance, "...at the cafe, wearing her red dress, and she is now holding a book and smiling."
- If userDescription suggests a *major, incompatible change* to clothing or environment (e.g., base image is "beach bikini", user says "in a winter coat in the snow"), you should **still prioritize generating variations of the original scene from the base image (beach bikini)**. The goal is a photoshoot of the *original scene*. You can subtly note if the user's request was too divergent to incorporate.

Example of one output prompt:
- Base Image: Shows AI girlfriend with brown hair, wearing a red summer dress, sitting at an outdoor cafe table.
- User Description: "looking happy"
- Generated Output Prompt (1 of 5): "Photorealistic image of the AI girlfriend (brown hair, matching base image appearance) wearing her red summer dress (from base image) and sitting at the outdoor cafe table (from base image). She is looking happy and smiling towards the camera. Slightly different camera angle, medium shot."

Output 5 distinct prompts structured like the example above.
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
        // The imagePromptText now contains very specific instructions to match the base image's elements (person, clothing, environment)
        // and then adds a variation.
        const imagePromptParts: any[] = [
            { media: { url: input.baseImageDataUri } }, // Base image for visual reference of the person
            { text: `${imagePromptText}. **Ensure the person's appearance (face, hair, body type) strictly matches the person in the provided base media.** The image should be high quality, detailed, with realistic lighting.` }
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

