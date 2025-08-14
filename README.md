
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

Чтобы запустить проект VirtualDate в VS Code, вам нужно будет одновременно запустить два процесса: Next.js сервер для фронтенда и Genkit сервер для AI-функций. Вот как это сделать:

Откройте проект в VS Code:

Если вы еще не сделали этого, откройте папку с вашим проектом в Visual Studio Code.
Откройте два интегрированных терминала:

Вы можете открыть терминал, выбрав в меню Terminal > New Terminal (или Вид > Терминал в русской версии VS Code).
Повторите это действие, чтобы открыть второй терминал. У вас должно быть два окна терминала, открытых в VS Code.
В первом терминале запустите Next.js (фронтенд):

Скопируйте и вставьте следующую команду в один из терминалов и нажмите Enter:
npm run dev

Эта команда запустит Next.js сервер разработки. Обычно он становится доступен по адресу http://localhost:9002 (как указано в скрипте dev вашего package.json). Следите за сообщениями в терминале, чтобы увидеть точный адрес.
Во втором терминале запустите Genkit (AI бэкенд):

Скопируйте и вставьте следующую команду в другой терминал и нажмите Enter:
npm run genkit:dev

Или, если вы хотите, чтобы Genkit автоматически перезапускался при изменениях в AI-файлах:
npm run genkit:watch

Эта команда запустит сервер Genkit, который обрабатывает AI-запросы. Он также выведет в консоль информацию о своем запуске, включая порт, на котором он работает (обычно http://localhost:3400).
Почему нужно два терминала?

Next.js (npm run dev) обслуживает пользовательский интерфейс вашего приложения – то, что вы видите и с чем взаимодействуете в браузере.
Genkit (npm run genkit:dev или npm run genkit:watch) обслуживает AI-потоки – логику, которая обращается к моделям Google для генерации текста, изображений и т.д.
Для полноценной работы приложения оба этих сервера должны быть запущены одновременно. После запуска вы сможете открыть http://localhost:9002 в вашем браузере, чтобы использовать приложение