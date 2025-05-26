
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
    imagePrompts: z.array(z.string()).length(5).describe("Five distinct, detailed image generation prompts. These prompts should describe variations of the scene (pose, angle, expression, minor details/actions) depicted in the base_image_data_uri, maintaining the person's appearance, clothing, and general environment from that base image. The user_description, if provided, should be incorporated as a modifier.")
  })},
  prompt: `You are an expert photoshoot director for an AI girlfriend.
You will be given:
1. A base image: {{media url=baseImageDataUri}}
   This base image shows the AI girlfriend. Carefully analyze it to understand:
   - Her core appearance (face, hair, body type - **this MUST be preserved**).
   - Her **current clothing** (this should generally be **preserved**).
   - The **current environment/location** (this is the **primary setting** for the photoshoot).
   - Any ongoing activity or mood.
2. An optional user description/modifier for the photoshoot: "{{#if userDescription}}{{{userDescription}}}{{else}}No specific modifier provided by the user.{{/if}}"

Your task is to generate 5 distinct and detailed text prompts for an image generation model.
These prompts MUST result in photorealistic images that are **variations or continuations of the scene in the base image**.
Imagine taking multiple shots of the AI girlfriend in that *same outfit* and *same general location/environment* from the base image, but from different camera angles, with slightly different poses, facial expressions, or by adding small, natural details or actions that fit the scene.

If a userDescription (modifier) is provided by the user, try to incorporate it naturally into these variations.
Examples:
- Base Image: Shows AI girlfriend in a blue summer dress, sitting at an outdoor cafe table.
- User Description: "holding a coffee cup"
- Generated Prompts should describe her in the blue dress at the outdoor cafe, but now in various poses holding/sipping a coffee cup (e.g., "close-up of her smiling while holding a coffee cup", "looking thoughtfully out from the cafe table, coffee cup in hand", etc.).

- Base Image: Shows AI girlfriend in a black bikini by a poolside.
- User Description: (empty or "just relaxing")
- Generated Prompts should describe her in the black bikini by the poolside in various relaxed poses (e.g., "lying on a sun lounger by the pool, eyes closed", "sitting on the edge of the pool, dipping her feet in the water", "adjusting her sunglasses, smiling at the camera, poolside background").

- Base Image: Shows AI girlfriend in hiking gear on a mountain path.
- User Description: "looking at the view with binoculars"
- Generated Prompts should show her in hiking gear on the mountain path, using binoculars to look at the view from different angles.

Each of your 5 generated prompts must:
- Aim for a photorealistic image.
- Describe the AI girlfriend, ensuring her appearance (face, hair, etc.) matches the baseImageDataUri.
- **Crucially, maintain the clothing and general environment/location seen in the baseImageDataUri.** Do not change her outfit or move her to a completely different location unless the userDescription strongly and compatibly suggests a minor, plausible addition (e.g. adding a hat if she's outdoors and user asks for "with a sunhat").
- Introduce variations in camera angle, pose, facial expression, or minor, contextually relevant details/actions.
- If userDescription is given and compatible, weave it into these variations. If it's very incompatible, prioritize the base image's scene and outfit.

Output 5 distinct prompts.
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
        // The image generation prompt now relies more on the detailed imagePromptText
        // which already incorporates instructions to maintain appearance from the base image.
        const imagePromptParts: any[] = [
            { media: { url: input.baseImageDataUri } }, // Base image for visual reference of the person
            { text: `Generate a new photorealistic image. **The person in this image MUST look like the person in the provided base media.** Refer to the base media for her face, hair, and body type. Scene details: ${imagePromptText}. Ensure the image is high quality, detailed, with realistic lighting, and accurately reflects the described scene and maintained appearance.` }
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

