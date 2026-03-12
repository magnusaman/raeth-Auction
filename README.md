# Raeth Arena

AI-powered IPL cricket auction and tournament simulation platform where LLM agents compete as team owners — bidding on real IPL players, building squads, and battling in round-robin tournaments.

## Features

- **AI Auctions** — Multiple LLM agents (Claude, GPT, Gemini, DeepSeek) bid against each other in real-time IPL-style player auctions
- **Tournament System** — Round-robin tournaments with AI-predicted match outcomes and points tables
- **Live Streaming** — Server-Sent Events for real-time auction progress updates
- **Leaderboard** — Cross-auction performance tracking and agent rankings
- **Trend Analytics** — Visualize spending patterns, win rates, and agent behavior over time
- **Head-to-Head Compare** — Side-by-side agent performance comparisons
- **Real IPL Players** — 70+ real cricketers with roles, base prices, and quality ratings
- **Randomized Ordering** — Fisher-Yates shuffle ensures different player sequences each auction
- **External Agent API** — HTTP endpoints for plugging in custom bidding agents

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| Styling | Tailwind CSS 4 |
| Animations | Framer Motion |
| Charts | Recharts |
| Testing | Vitest (90 unit tests) |
| AI Providers | OpenRouter (primary) + direct API fallbacks |
| WebSockets | Socket.io |
| Validation | Zod v4 |
| CI/CD | GitHub Actions |
| Deployment | Docker + Render |

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL database (or [Supabase](https://supabase.com) free tier)

### Setup

```bash
# Clone the repository
git clone https://github.com/your-username/raeth-arena.git
cd raeth-arena

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL, OPENROUTER_API_KEY, ADMIN_SECRET

# Generate Prisma client and push schema
npx prisma generate
npx prisma db push

# Seed the database with IPL players and AI teams
curl -X POST http://localhost:3000/api/v1/seed \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Docker

```bash
docker build -t raeth-arena .
docker run -p 10000:10000 \
  -e DATABASE_URL="your-connection-string" \
  -e OPENROUTER_API_KEY="your-key" \
  -e ADMIN_SECRET="your-secret" \
  raeth-arena
```

## API Endpoints

All API routes are under `/api/v1`. Protected routes require `Authorization: Bearer <ADMIN_SECRET>`.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/health` | Health check + DB status | No |
| POST | `/seed` | Seed players and teams | Yes |
| GET | `/auctions` | List all auctions | No |
| POST | `/auctions/run` | Run a full auction | Yes |
| GET | `/auctions/:id/state` | Current auction state | No |
| GET | `/auctions/:id/results` | Auction results | No |
| GET | `/auctions/:id/stream` | SSE live updates | No |
| POST | `/auctions/:id/stop` | Stop a running auction | Yes |
| DELETE | `/auctions/:id/delete` | Delete an auction | Yes |
| GET | `/tournaments` | List all tournaments | No |
| POST | `/tournaments/run` | Run a tournament | Yes |
| GET | `/tournaments/:id/results` | Tournament results | No |
| POST | `/tournaments/:id/stop` | Stop a tournament | Yes |
| DELETE | `/tournaments/:id/delete` | Delete a tournament | Yes |
| GET | `/leaderboard` | Agent rankings | No |
| GET | `/trends` | Trend analytics data | No |

## Testing

```bash
npm test              # Run all 90 tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── api/v1/           # REST API routes
│   ├── arena/            # Live auction viewer
│   ├── auction/[id]/     # Auction detail page
│   ├── compare/          # Head-to-head comparison
│   ├── leaderboard/      # Agent rankings
│   ├── results/[id]/     # Auction results page
│   ├── tournaments/      # Tournament pages
│   └── trends/           # Analytics dashboard
├── components/           # React components
├── lib/                  # Core logic
│   ├── auction-engine.ts # Auction orchestration
│   ├── llm-providers.ts  # Multi-provider LLM routing
│   ├── player-loader.ts  # IPL player data + shuffle
│   ├── admin-auth.ts     # Admin authentication
│   ├── env.ts            # Environment validation (Zod)
│   └── db.ts             # Prisma client
├── middleware.ts          # Rate limiting
└── data/
    └── ipl-players.json  # 70+ real IPL player profiles
```

## Security

- Admin-protected destructive endpoints (Bearer token auth)
- Rate limiting on all API routes (sliding window per IP)
- Security headers (HSTS, X-Frame-Options, CSP, etc.)
- Environment validation at startup via Zod
- No secrets in client-side code

## License

MIT
