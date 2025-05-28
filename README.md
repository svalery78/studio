
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Chat Commands

The application supports several commands that can be typed into the chat input:

-   `/start`
    -   **Description**: Resets the current chat session and all settings. This will clear the chat history, remove any saved AI companion preferences (name, personality, appearance, voice), and initiate the setup process again from the beginning.
    -   **Usage**: Type `/start`

-   `/photo [description] [optional_image_data_uri]`
    -   **Description**: Initiates an AI-generated "photoshoot" consisting of 5 images.
        -   The `[description]` is a text prompt that defines the theme or scene for the photoshoot (e.g., "at the beach", "wearing a festive outfit"). This part is optional. If not provided, the AI will attempt to base the photoshoot theme on the `optional_image_data_uri` if present, or create a general photoshoot if not.
        -   The `[optional_image_data_uri]` allows you to provide a specific base image (as a data URI, e.g., `data:image/png;base64,...`) directly in the command. If provided, this image will be used to maintain character consistency for the photoshoot.
        -   If `[optional_image_data_uri]` is not provided in the command, the AI's current selected avatar will be used as the base image for character consistency.
    -   **Usage Examples**:
        -   `/photo relaxing in a park` (uses current AI avatar as base)
        -   `/photo data:image/jpeg;base64,/9j/4AAQSkZJRg... at a cafe` (uses the provided image data URI as base for a cafe scene)
        -   `/photo` (uses current AI avatar, AI will try to generate a general photoshoot)

-   `/voice`
    -   **Description**: Allows you to change the AI companion's voice during an active chat session. This will bring up the voice selection interface.
    -   **Usage**: Type `/voice`

-   `/repeat`
    -   **Description**: Toggles the automatic voice playback of the AI companion's messages. When enabled, new messages from the AI will be spoken aloud automatically. When disabled, you will need to manually click the play button next to each AI message to hear it.
    -   **Usage**: Type `/repeat`

-   `/help`
    -   **Description**: Displays a list of all available commands and their descriptions.
    -   **Usage**: Type `/help`

