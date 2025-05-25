
'use server';
/**
 * @fileOverview Generates AI responses for the setup process.
 * - getSetupPrompt - A function to get the next setup question/statement.
 * - GetSetupPromptInput - Input type.
 * - GetSetupPromptOutput - Output type.
 * - SetupStepType - Enum for setup steps.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define specific steps for clarity in schema and prompts
const SetupStepEnum = z.enum([
  'INITIATE_SETUP', // AI's very first message
  'ASK_PERSONALITY',
  'ASK_TOPICS',
  'ASK_VOICE_PREFERENCE', // New step: Ask if user wants to customize voice
  'ASK_APPEARANCE_DESCRIPTION',
  'CONFIRM_BEFORE_GENERATION'
]);
export type SetupStepType = z.infer<typeof SetupStepEnum>;

const GetSetupPromptInputSchema = z.object({
  currentStep: SetupStepEnum,
  userName: z.string().optional().describe("The user's name, if known."),
  userRawInput: z.string().optional().describe("The user's raw text input from the previous step or an initial language hint. This message is used for language detection."),
});
export type GetSetupPromptInput = z.infer<typeof GetSetupPromptInputSchema>;

const GetSetupPromptOutputSchema = z.object({
  aiResponse: z.string().describe("The AI's next question or guiding statement for the setup process, delivered in the user's language based on 'userRawInput'."),
});
export type GetSetupPromptOutput = z.infer<typeof GetSetupPromptOutputSchema>;

export async function getSetupPrompt(input: GetSetupPromptInput): Promise<GetSetupPromptOutput> {
  return getSetupPromptFlow(input);
}

// Base instructions for each step, LLM will formulate the actual question/statement
const setupTaskInstructions: Record<SetupStepType, string> = {
  [SetupStepEnum.enum.INITIATE_SETUP]: "Your goal is to start a setup conversation. Greet the user warmly. Ask for their name or nickname. This is your very first message to them in this setup.",
  [SetupStepEnum.enum.ASK_PERSONALITY]: "The user, {{userName}}, has just provided their name in their last message: '{{userRawInput}}'. Now, ask them to describe the personality traits they'd like you to have. Give a brief example like 'e.g., witty and adventurous' or 'calm and supportive'.",
  [SetupStepEnum.enum.ASK_TOPICS]: "The user, {{userName}}, just described their desired personality in their last message: '{{userRawInput}}'. Now, ask them what kind of topics they enjoy discussing. Give a brief example like 'e.g., science fiction movies, classical music, and philosophy'.",
  [SetupStepEnum.enum.ASK_VOICE_PREFERENCE]: "The user, {{userName}}, just told you their topic preferences in their last message: '{{userRawInput}}'. Now, ask them if they would like to choose a specific voice for you to use when speaking, or if they are happy with a default voice. Keep it simple, like 'I can also speak my responses. Would you like to choose a specific voice for me, or should I use a default one? Just say 'yes' or 'no'.'",
  [SetupStepEnum.enum.ASK_APPEARANCE_DESCRIPTION]: "The user, {{userName}}, has just responded to the voice preference question (their response was '{{userRawInput}}'). Now, ask them to describe how they'd like you to look. Give a brief example like 'e.g., long curly red hair, green eyes, and a friendly smile'. Explain that this description will help generate visual options for them to choose from.",
  [SetupStepEnum.enum.CONFIRM_BEFORE_GENERATION]: "The user, {{userName}}, has just described their desired appearance in their last message: '{{userRawInput}}'. Thank them for all the information. Politely inform them that you will now generate a few appearance options based on their description and that this might take a moment."
};

const getSetupPromptFlow = ai.defineFlow(
  {
    name: 'getSetupPromptFlow',
    inputSchema: GetSetupPromptInputSchema,
    outputSchema: GetSetupPromptOutputSchema,
  },
  async (input) => {
    const taskInstruction = setupTaskInstructions[input.currentStep];
    if (!taskInstruction) {
      return { aiResponse: "An error occurred during setup. Please try typing /start to begin again." };
    }

    const promptInputData: { userName?: string; userRawInput?: string } = {};
    if (input.userName) promptInputData.userName = input.userName;
    if (input.userRawInput) promptInputData.userRawInput = input.userRawInput;
    
    const systemPrompt = `You are a friendly AI companion guiding a user through a setup process.
IMPORTANT: You MUST respond in the language of the 'userRawInput'. If 'userRawInput' is a general instruction like 'Start in English', use that language. If it's a user's conversational message, match that language.
Keep your responses concise, friendly, and focused on the current setup step.
{{#if userName}}The user's name is {{userName}}.{{/if}}

{{#if userRawInput}}The user's most recent input (use for language context and, if relevant, content analysis) was: "{{userRawInput}}".{{else}}The user is just starting the setup.{{/if}}

Your current task: ${taskInstruction}`;
    
    const stepPrompt = ai.definePrompt({
        name: `setupStepPrompt_${input.currentStep}`,
        input: { schema: GetSetupPromptInputSchema.pick({ userName: true, userRawInput: true}) },
        output: { schema: z.object({ aiResponse: z.string() }) },
        prompt: systemPrompt,
    });
    
    const { output } = await stepPrompt(promptInputData);

    return { aiResponse: output?.aiResponse || "I'm sorry, I'm having a little trouble getting set up. Could we try typing /start again?" };
  }
);
