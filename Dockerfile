# Use a standard Node.js image
FROM node:20-slim AS base

# Install PNPM
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Install dependencies needed for downloading and pg_isready
RUN apt-get update && apt-get install -y wget ca-certificates postgresql-client && rm -rf /var/lib/apt/lists/*

# --- Stage: Dependencies ---
FROM base AS dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# --- Stage: Model Download ---
FROM base AS model-downloader
WORKDIR /app/hf_models/models/gte-small
RUN echo "Downloading gte-small model files..." && \
    wget -q --show-progress --content-disposition "https://huggingface.co/thenlper/gte-small/resolve/main/config.json" && \
    wget -q --show-progress --content-disposition "https://huggingface.co/thenlper/gte-small/resolve/main/pytorch_model.bin" && \
    wget -q --show-progress --content-disposition "https://huggingface.co/thenlper/gte-small/resolve/main/tokenizer.json" && \
    wget -q --show-progress --content-disposition "https://huggingface.co/thenlper/gte-small/resolve/main/tokenizer_config.json" && \
    wget -q --show-progress --content-disposition "https://huggingface.co/thenlper/gte-small/resolve/main/special_tokens_map.json"

# --- Stage: Runtime ---
FROM base AS runtime
# Copy node_modules from dependencies stage
COPY --from=dependencies /app/node_modules /app/node_modules
# Copy model from model-downloader stage
COPY --from=model-downloader /app/hf_models /app/hf_models
# Copy application code
COPY . .

# Environment variables
ENV NODE_ENV=development
ENV HUGGING_FACE_MODEL_DIR=/app/hf_models/models/gte-small

# Expose port
EXPOSE 3000

# Copy and set up entrypoint
COPY scripts/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["entrypoint.sh"]
CMD ["pnpm", "start:dev"]