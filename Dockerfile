FROM node:20-slim

RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# 2. Copy source code
COPY . .

# 3. Generate Prisma client
RUN npx prisma generate

# 4. Build Next.js (dummy env vars for build-time validation only)
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    OPENROUTER_API_KEY="build-placeholder" \
    ADMIN_SECRET="build-placeholder-min16chars" \
    npm run build

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:${PORT:-10000}/api/v1/health || exit 1

# On startup: push schema to DB, then start the server on the correct port
CMD ["sh", "-c", "npx prisma db push && npm start -- -p ${PORT:-10000}"]
