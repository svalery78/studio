
# VirtualDate Project Overview

This document provides an overview of the VirtualDate application, detailing the structure and purpose of its key files and directories.

## 1. Core Application Logic & UI

### `src/app/page.tsx`
- **Purpose**: Main entry point for the user interface. Handles the entire application state, user interactions, setup process, chat functionality, and communication with AI flows.
- **Key Functions**:
    - Manages application settings (user preferences, AI personality, appearance) using `useLocalStorage`.
    - Handles the multi-step setup process (conversational setup, voice selection, appearance generation and selection).
    - Manages chat messages (sending, receiving, displaying).
    - Processes user commands like `/start`, `/photo`, `/voice`, `/repeat`.
    - Calls AI flows for:
        - Starting and continuing conversations.
        - Generating setup prompts.
        - Generating appearance options.
        - Generating selfies.
        - Generating photoshoot images.
    - Manages UI states (loading, AI responding, generating images).
    - Integrates with `SpeechSynthesis` for voice output and `SpeechRecognition` for voice input.

### `src/app/layout.tsx`
- **Purpose**: Root layout component for the Next.js application.
- **Key Functions**:
    - Sets up the HTML structure, including language and font (Geist Sans, Geist Mono).
    - Wraps the application with `ThemeProvider` for light/dark mode and `Toaster` for notifications.

### `src/app/globals.css`
- **Purpose**: Defines global styles and Tailwind CSS theme variables (HSL-based for ShadCN).
- **Key Functions**:
    - Sets up Tailwind CSS base, components, and utilities.
    - Defines CSS custom properties for light and dark themes, including colors for background, foreground, primary (AI messages), secondary, accent (User messages), destructive, etc.
    - Includes styles for scrollbars.

## 2. AI Functionality (Genkit Flows & Tools)

### `src/ai/genkit.ts`
- **Purpose**: Initializes and configures the Genkit instance.
- **Key Functions**:
    - Creates a global `ai` object used by all flows.
    - Configures Genkit with the `googleAI` plugin.
    - Sets the default model to `googleai/gemini-2.0-flash`.

### `src/ai/dev.ts`
- **Purpose**: Entry point for the Genkit development server (`genkit start`).
- **Key Functions**:
    - Imports all defined AI flows to make them available to the Genkit development environment.
    - Loads environment variables using `dotenv`.

### `src/ai/flows/continue-conversation.ts`
- **Purpose**: Manages the ongoing conversation with the AI girlfriend.
- **Input**: `ContinueConversationInput` (last user message, chat history, personality, topic preferences).
- **Output**: `ContinueConversationOutput` (AI's text response, decision on selfies, selfie context).
- **Key Functions**:
    - Uses an LLM to generate a conversational response.
    - Implements logic for the AI to decide whether to:
        - Respond normally.
        - Generate a selfie immediately (if implicitly requested by the user).
        - Proactively offer a selfie (and ask for user confirmation).
    - Ensures responses are in the user's language.
    - Handles potential errors from the LLM (e.g., model overload) and returns a user-friendly message.

### `src/ai/flows/generate-appearance-options.ts`
- **Purpose**: Generates multiple photorealistic portrait options for the AI girlfriend during setup.
- **Input**: `GenerateAppearanceOptionsInput` (user's textual description of desired appearance).
- **Output**: `GenerateAppearanceOptionsOutput` (an array of 4 image data URIs).
- **Key Functions**:
    - Uses an initial LLM prompt (`imagePromptRefinement`) to create 4 varied image generation prompts from a single user description.
    - Calls the image generation model 4 times to produce distinct portrait options.

### `src/ai/flows/generate-photoshoot-images.ts`
- **Purpose**: Generates a "photoshoot" of 5 distinct images based on a user's textual description and/or a base image of the AI girlfriend.
- **Input**: `GeneratePhotoshootImagesInput` (user's description for the photoshoot theme, base image data URI).
- **Output**: `GeneratePhotoshootImagesOutput` (an array of up to 5 image data URIs, optional error message).
- **Key Functions**:
    - Uses an initial LLM prompt (`photoshootVariationPromptsGenerator` or `photoshootScenePromptsGenerator` based on reverted state) to generate 5 distinct scene/variation prompts. This prompt analyzes the `baseImageDataUri` for clothing and environment details and tries to create variations based on that, incorporating the `userDescription` if provided.
    - Calls the image generation model 5 times, using the `baseImageDataUri` for character consistency and the generated prompts for scene/variation details.

### `src/ai/flows/generate-selfie.ts`
- **Purpose**: Generates a single photorealistic selfie of the AI girlfriend.
- **Input**: `GenerateSelfieInput` (personality traits, topic preferences, chat history, base image data URI, user's specific selfie request text).
- **Output**: `GenerateSelfieOutput` (selfie image data URI, optional error message if generation fails).
- **Key Functions**:
    - Uses an LLM prompt (`sceneDescriptionPrompt`) to decide on a creative scene (location, clothing, activity, mood) for the selfie. This considers the AI's personality, user preferences, recent chat history (for location/clothing context), and the user's specific request text.
    - Calls the image generation model using the `baseImageDataUri` for character consistency and the generated scene description.

### `src/ai/flows/get-setup-prompt.ts`
- **Purpose**: Generates AI responses for each step of the conversational setup process.
- **Input**: `GetSetupPromptInput` (current setup step, user name, user's last raw input for language detection).
- **Output**: `GetSetupPromptOutput` (AI's next question or guiding statement).
- **Key Functions**:
    - Provides tailored AI prompts for each setup stage (greeting, asking for name, personality, topics, voice preference, appearance description, confirmation before image generation).
    - Ensures AI responses are in the user's language based on `userRawInput`.

### `src/ai/flows/start-conversation.ts`
- **Purpose**: Generates the AI's first message to the user after setup is complete or when a returning user re-opens the app.
- **Input**: `StartConversationInput` (AI personality traits, user topic preferences).
- **Output**: `StartConversationOutput` (AI's first message).
- **Key Functions**:
    - Composes a personalized welcome message based on the AI's personality and user's interests.
    - Attempts to use the language primarily found in `topicPreferences` or a universal friendly tone.

## 3. UI Components

### `src/components/chat/`
    - **`chat-avatar.tsx`**: Displays the avatar for user and AI messages. For AI, it uses the `selectedAvatarDataUri` from `appSettings` if available, otherwise a default bot icon. For users, it's a default user icon.
    - **`chat-input.tsx`**: Renders the chat input field, send button, selfie request button, and voice input button. Handles text input, submission, and integrates `SpeechRecognition` for voice-to-text.
    - **`chat-message.tsx`**: Renders individual chat messages. Displays text, images (selfies), sender avatar, timestamp. Includes a button for text-to-speech playback of AI messages using `SpeechSynthesis`, attempting to use a selected or suitable female voice.
    - **`chat-window.tsx`**: The main chat interface, displaying a scrollable list of messages and embedding the chat input. Manages the display of a "typing..." indicator for AI responses.

### `src/components/layout/`
    - **`header.tsx`**: Displays the application header with the logo, "VirtualDate" title, and the theme toggle button.
    - **`main-container.tsx`**: A simple wrapper component providing consistent padding and layout for the main content area within the application.

### `src/components/ui/`
    - This directory contains various reusable UI components from **ShadCN UI** (e.g., `button.tsx`, `card.tsx`, `dialog.tsx`, `input.tsx`, `select.tsx`, `textarea.tsx`, `toast.tsx`, `avatar.tsx`, `label.tsx`, `scroll-area.tsx`, etc.). These are pre-styled components built on Radix UI and Tailwind CSS, customized for the project's theme.

### `src/components/icons/logo.tsx`
- **Purpose**: Defines the SVG for the application logo (a stylized heart).

### `src/components/mode-toggle.tsx`
- **Purpose**: Provides a button within a dropdown menu to toggle between light, dark, and system themes, utilizing the `next-themes` library.

### `src/components/settings-form.tsx` (Legacy)
- **Purpose**: Originally used for a form-based initial setup. Currently not directly used for the initial setup (which is now conversational) but contains the Zod schema and form structure that could be adapted for an "edit settings" feature.
- **Key Functions**: Uses `react-hook-form` and `zod` for form validation. Defines fields for user name, AI personality, topic preferences, and AI appearance description.

### `src/components/theme-provider.tsx`
- **Purpose**: Wraps the application to provide theme management capabilities from `next-themes`, allowing dynamic switching between light and dark modes.

### `src/components/voice-selector.tsx`
- **Purpose**: UI component for selecting the AI's voice during the conversational setup or via the `/voice` command.
- **Key Functions**:
    - Lists available browser voices (`SpeechSynthesisVoice`).
    - Allows previewing each voice.
    - Allows selecting a specific voice or choosing to use the default system voice.
    - Handles cases where voices might not be immediately available.

## 4. Hooks

### `src/hooks/use-chat-scroll.ts`
- **Purpose**: Custom React hook that takes a dependency (typically the messages array) and returns a ref. It ensures that the referenced scrollable element automatically scrolls to the bottom when the dependency changes, keeping the latest message in view.

### `src/hooks/use-local-storage.ts`
- **Purpose**: Custom React hook for managing state that needs to be persisted in the browser's `localStorage`. It synchronizes state between the React component and `localStorage`, and handles initial value retrieval. Used for storing `appSettings`.

### `src/hooks/use-mobile.tsx`
- **Purpose**: Custom React hook to detect if the application is being viewed on a mobile-sized screen (based on a predefined breakpoint). Returns a boolean. (Note: This hook seems to be present in `src/components/ui/sidebar.tsx` but not as a standalone hook file in `src/hooks/`). If it's a standalone hook, its description is as stated. If it's part of sidebar, it's a utility within that component. *Correction: The file list shows `src/hooks/use-mobile.tsx` so it is a standalone hook.*

### `src/hooks/use-toast.ts`
- **Purpose**: Custom React hook for displaying toast notifications. It manages a queue of toasts, their display state, and provides a `toast()` function to trigger new notifications. Inspired by `react-hot-toast`.

## 5. Libraries & Constants

### `src/lib/constants.ts`
- **Purpose**: Defines shared constants and TypeScript interfaces used throughout the application.
- **Key Definitions**:
    - `LOCAL_STORAGE_SETTINGS_KEY`: Storage key for app settings.
    - `AppSettings`: Interface defining the structure of application settings (personality, topics, username, appearance, avatar URI, voice name, auto-play preference).
    - `DEFAULT_SETTINGS_DRAFT`, `DEFAULT_PERSONALITY_TRAITS`, etc.: Default values for various settings used during setup.
    - `Message`: Interface defining the structure of chat messages (id, sender, text, image URL, timestamp).

### `src/lib/utils.ts`
- **Purpose**: Contains utility functions. Currently, its primary utility is `cn`, a helper function that merges Tailwind CSS classes conditionally using `clsx` and `tailwind-merge`.

## 6. Configuration Files

### `package.json`
- **Purpose**: Defines project metadata, scripts (e.g., `dev` for Next.js, `genkit:dev` for Genkit, `build`, `start`), and all project dependencies and devDependencies.
- **Key Dependencies**: `next`, `react`, `genkit`, `@genkit-ai/googleai`, various `@radix-ui/*` components (foundation for ShadCN), `lucide-react` (icons), `tailwindcss`, `zod` (schema validation).

### `next.config.ts`
- **Purpose**: Configuration file for the Next.js framework.
- **Key Settings**:
    - Disables TypeScript and ESLint error checking during builds (for faster prototyping iterations).
    - Configures image optimization: defines allowed remote patterns (e.g., for `placehold.co`), and `dangerouslyAllowSVG` (relevant for data URIs).

### `tailwind.config.ts`
- **Purpose**: Configuration file for Tailwind CSS.
- **Key Settings**:
    - Enables class-based dark mode.
    - Specifies paths for Tailwind to scan for class usage.
    - Extends the default theme with custom colors (using HSL variables defined in `globals.css`), border radius values, and keyframe animations for components like accordions.
    - Includes the `tailwindcss-animate` plugin.

### `tsconfig.json`
- **Purpose**: TypeScript compiler configuration for the project.
- **Key Settings**:
    - Sets compiler options like target ECMAScript version, libraries, module system, JSX behavior.
    - Defines path aliases (e.g., `@/*` resolving to `./src/*`) for cleaner imports.

### `components.json`
- **Purpose**: Configuration file specific to ShadCN UI.
- **Key Settings**:
    - Specifies the UI style, RSC (React Server Components) usage, and if TSX is used.
    - Points to Tailwind configuration and global CSS files.
    - Defines path aliases used by ShadCN CLI for generating components.
    - Sets the default icon library to `lucide`.

### `apphosting.yaml`
- **Purpose**: Configuration file for Firebase App Hosting.
- **Key Settings**: Includes `runConfig` like `maxInstances` to manage backend scaling.

### `.env`
- **Purpose**: Used for storing environment variables, such as API keys for Google AI services. This file is not committed to version control for security reasons.

### `.vscode/settings.json`
- **Purpose**: Contains VS Code editor-specific settings, potentially for enabling features like AI-assisted inline completion or codebase indexing for the IDX environment.

## 7. Project Documentation

### `README.md`
- **Purpose**: Provides a general introduction to the VirtualDate project and, importantly, lists and describes the available chat commands (`/start`, `/photo`, `/voice`, `/repeat`) for the user.

---

This overview should help in understanding the different parts of the VirtualDate application and how they interact.

    