# Stage 1: Build stage
FROM node:20.11.1 AS build
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json package-lock.json ./
COPY scripts/ ./scripts/

# Install all dependencies including devDependencies
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma/ ./prisma/
RUN npx prisma generate

# Copy source files and build
COPY . .
RUN npm run build

# Stage 2: Runtime stage
FROM node:20.11.1-slim AS runtime
WORKDIR /app

# Install runtime dependencies
COPY package*.json ./
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

# Set permissions for scripts
RUN chmod -R 755 /app/scripts || true

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built files and Prisma schema
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Install curl for healthcheck
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Healthcheck – utilise l'endpoint interne non filtré
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -fsS http://localhost:${PORT:-3000}/health/internal || exit 1

# Default command
CMD ["node", "dist/server.js"]
