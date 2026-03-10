FROM node:20-slim

# better-sqlite3 requires native compilation tools
RUN apt-get update && \
    apt-get install -y python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# 2. Copy source code
COPY . .

# 3. Generate Prisma client
RUN npx prisma generate

# 4. Build Next.js
RUN npm run build

# 5. Create data directory for SQLite
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/data/raeth.db"

EXPOSE 3000

# On startup: create DB tables if missing, then start the server
CMD ["sh", "-c", "npx prisma db push && npm start"]
