FROM node:20-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

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

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

# On startup: push schema to DB, then start the server on the correct port
CMD ["sh", "-c", "npx prisma db push --skip-generate && npm start -- -p ${PORT:-10000}"]
