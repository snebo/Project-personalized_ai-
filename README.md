# My Diary Friend 📖🤖

**My Diary Friend** is an intelligent, privacy-focused diary and personal assistant built with NestJS. It leverages advanced Large Language Models (LLMs) and vector embeddings to help you capture, organize, and retrieve your thoughts and memories with ease.

## Key Capabilities 🚀

- **Intelligent Conversations**: Chat with your diary to record new entries, ask about past memories, or get insights into your life.
- **Semantic Retrieval**: Uses `gte-small` vector embeddings to find relevant memories based on meaning, not just keywords.
- **Multi-Source Integration**: Support for documents, conversations, and personal memories.
- **Robust Architecture**: Built with NestJS for scalability and maintainability.
- **Database Power**: Integrated with Supabase and PostgreSQL with `pgvector` for efficient storage and semantic search.
- **LLM-Powered Insights**: Seamlessly integrates with models like Google Gemini (via LangChain) for natural language understanding and generation.
- **Privacy First**: Designed for local development and self-hosting with Docker.

## Tech Stack 🛠️

- **Framework**: [NestJS](https://nestjs.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Compatible with TypeScript 6)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [pgvector](https://github.com/pgvector/pgvector)
- **Auth & Services**: [Supabase](https://supabase.com/)
- **LLM Orchestration**: [LangChain](https://js.langchain.com/)
- **Embeddings**: Hugging Face `gte-small`
- **Containerization**: [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)

---

## Getting Started with Docker 🐳

The easiest way to get the project up and running is using Docker. This will set up the database and the application environment for you.

### 1. Prerequisites
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### 2. Configuration
Copy the example environment file and update it with your own keys (especially your `GOOGLE_API_KEY`):

```bash
cp .env.example .env
```

### 3. Run the Application
Start the environment with a single command:

```bash
docker compose up --build
```

This command will:
1.  Set up a PostgreSQL database with `pgvector` enabled.
2.  Install all necessary project dependencies using `pnpm`.
3.  **Automatically download the `gte-small` model** from Hugging Face into the `hf_models` folder.
4.  **Run automated tests** to ensure everything is correctly configured.
5.  Start the NestJS application in **development mode** (with live-reload).

The application will be accessible at: `http://localhost:3000` (or whatever port you set in your `.env`).

---

## Development Workflow 🛠️

### Manual Setup (Optional)
If you prefer to run the project locally without Docker:

1.  **Install Dependencies**:
    ```bash
    pnpm install
    ```
2.  **Ensure PostgreSQL with pgvector is running**.
3.  **Download the Model**: The project expects the `gte-small` model files to be in `hf_models/models/gte-small`.
4.  **Run Tests**:
    ```bash
    pnpm test
    ```
5.  **Start Development Mode**:
    ```bash
    pnpm start:dev
    ```

---

## Example Files 📄

-   **.env.example**: A template for all required environment variables.
-   **docker-compose.yml.example**: A fully commented version of the Docker Compose configuration, explaining each service and its setup.

## Testing 🧪

Tests are automatically run during the Docker build process and every time the container starts. You can also run them manually:

```bash
# Inside the container or locally
pnpm run test
```

## License 📜

This project is [UNLICENSED](LICENSE).
