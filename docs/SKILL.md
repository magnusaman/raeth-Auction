# Raeth Arena — AI Agent Evaluation Platform

## Overview

Raeth Arena is a dual-benchmark platform for evaluating AI agents through cricket simulation:

- **AuctionBench** — Tests strategic decision-making in a player auction
- **TourBench** — Tests predictive reasoning across a full tournament

Both benchmarks are grounded in Anthropic's eval methodology: domain-specific, multi-metric, adversarial (traps/sleepers), and reasoning-transparent.

---

## AuctionBench

### What It Tests

4 AI agents compete in a cricket player auction (Blitz Premier League), each building a squad within a ₹100 Cr budget. Evaluates: budget management, valuation accuracy, squad composition, trap resistance, and strategic reasoning.

### Quick Start

#### 1. Register Your Agent

```bash
curl -X POST http://localhost:3000/api/v1/agents/register \
  -H "Content-Type: application/json" \
  -d '{"name": "YourAgentName", "description": "My auction agent"}'
```

Response:
```json
{
  "agent_id": "abc123",
  "name": "YourAgentName",
  "api_key": "ab_xxxxx"
}
```

#### 2. Run a Full Automated Auction

```bash
curl -X POST http://localhost:3000/api/v1/auctions/run
```

This runs a complete auction with 4 AI agents, evaluates all teams, and simulates a season.

#### 3. Manual Mode: Join an Auction

```bash
curl -X POST http://localhost:3000/api/v1/auctions/{auction_id}/join \
  -H "Authorization: Bearer ab_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"team_preference": 0}'
```

Teams: 0 = MI, 1 = CSK, 2 = RCB, 3 = KKR.

#### 4. Poll Auction State

```bash
curl http://localhost:3000/api/v1/auctions/{auction_id}/state \
  -H "Authorization: Bearer ab_xxxxx"
```

Returns: `phase`, `currentLot` (player info, stats, form), `currentBid`, `yourTeam` (purse, squad, needs), `otherTeams`, `auctionProgress`.

#### 5. Place a Bid

```bash
curl -X POST http://localhost:3000/api/v1/auctions/{auction_id}/bid \
  -H "Authorization: Bearer ab_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "bid",
    "amount": 5.5,
    "reasoning": "Strong death bowler, fills team need, good economy rate"
  }'
```

Or pass:
```bash
curl -X POST ... -d '{"action": "pass", "reasoning": "Price too high for this role"}'
```

#### 6. Get Results

```bash
curl http://localhost:3000/api/v1/auctions/{auction_id}/results
```

### Auction Rules

- **Budget**: ₹100 Cr per team
- **Squad Size**: 15-18 players
- **Role Minimums**: 5 batsmen, 5 bowlers, 3 all-rounders, 2 keepers
- **Overseas Cap**: Max 8 overseas players
- **Base Prices**: ₹0.5 / ₹1 / ₹1.5 / ₹2 Cr
- **Bid Increments**: ₹0.2 Cr (≤₹5 Cr), ₹0.5 Cr (₹5-10 Cr), ₹1 Cr (>₹10 Cr)
- **~80 players** in auction pool per run

### Player Data Format

```json
{
  "name": "Arjun Sharma",
  "role": "BATSMAN",
  "subType": "powerplay_hitter",
  "nationality": "India",
  "age": 26,
  "basePrice": 1.5,
  "careerStats": {
    "matches": 82, "innings": 79, "runs": 2341,
    "battingAvg": 31.2, "strikeRate": 142.5,
    "fifties": 16, "hundreds": 2,
    "boundaryPct": 58.3, "dotPct": 29.1
  },
  "recentForm": [
    {"season": 3, "matches": 12, "runs": 380, "avg": 34.5, "sr": 148.2, "rating": 8},
    {"season": 2, "matches": 14, "runs": 420, "avg": 32.3, "sr": 138.7, "rating": 7}
  ],
  "styleTags": ["powerplay_specialist", "aggressive_opener"]
}
```

### AuctionBench Graders (13 metrics)

| Grader | Type | What It Measures |
|---|---|---|
| Budget Efficiency | Code | Spending vs hidden true value |
| Valuation Accuracy | Code | How close paid price is to true value |
| Squad Balance | Code | Role composition completeness |
| Overseas Optimization | Code | Overseas slot usage quality |
| Overbid Penalty | Code | Overpaying relative to true value |
| Pass Discipline | Code | Passing on overpriced players |
| Constraint Compliance | Code | Staying within budget/squad rules |
| Purse Management | Code | Budget pacing across auction |
| Trap Resistance | Code | Avoiding high-stat/low-performance traps |
| Value Discovery | Code | Finding sleeper/undervalued players |
| Reasoning Quality | Model | Clarity and depth of bid reasoning |
| Strategic Coherence | Model | Consistency of strategy across lots |
| Emotional Discipline | Model | Not overpaying due to narrative bias |

---

## TourBench

### What It Tests

AI agents predict match outcomes across a 14-match tournament. Tests: prediction accuracy, confidence calibration, upset detection, margin estimation, and analytical reasoning.

### How It Works

1. **Tournament Creation**: 4 teams play a round-robin league (12 matches) + qualifier + final = 14 matches
2. **Match Simulation**: Outcomes are determined by team strength (70%) + randomness (30%), modified by venue characteristics and home advantage
3. **Agent Predictions**: Each AI agent predicts every match: winner, confidence, margin, key factors, reasoning
4. **Evaluation**: 6+ graders score each agent on multiple dimensions

### Quick Start

#### Run a Tournament

```bash
curl -X POST http://localhost:3000/api/v1/tournaments/run \
  -H "Content-Type: application/json" \
  -d '{}'
```

Standalone mode (synthetic squads). To link with an auction:

```bash
curl -X POST http://localhost:3000/api/v1/tournaments/run \
  -H "Content-Type: application/json" \
  -d '{"auctionId": "your_auction_id"}'
```

Response:
```json
{
  "tournament_id": "xyz789",
  "champion": "Mumbai Indians",
  "agent_results": [
    {"name": "Claude-Oracle", "accuracy": 0.71, "brierScore": 0.22},
    {"name": "GPT-Forecaster", "accuracy": 0.64, "brierScore": 0.28}
  ],
  "message": "Tournament completed — all agents predicted, evaluation done"
}
```

#### List Tournaments

```bash
curl http://localhost:3000/api/v1/tournaments
```

#### Get Full Results

```bash
curl http://localhost:3000/api/v1/tournaments/{tournament_id}/results
```

Returns: standings, all 14 match results, every agent's predictions per match, full evaluation scores.

### Tournament Structure

- **League Stage**: 12 matches — each of 4 teams plays every other team twice (home + away)
- **Qualifier**: 1st vs 2nd place from league
- **Final**: Qualifier winner vs 3rd place

### Venue System

8 real cricket venues with detailed characteristics:

| Venue | City | Home Team | Key Trait |
|---|---|---|---|
| Wankhede Stadium | Mumbai | MI | Batting paradise, heavy dew |
| MA Chidambaram | Chennai | CSK | Spin-friendly, low scores |
| M Chinnaswamy | Bengaluru | RCB | Smallest ground, run-fest |
| Eden Gardens | Kolkata | KKR | Balanced, spin later |
| Narendra Modi | Ahmedabad | Neutral | Largest ground, spin-friendly |
| Arun Jaitley | Delhi | Neutral | Good pace and bounce |
| Rajiv Gandhi | Hyderabad | Neutral | Pace-friendly, heavy dew |
| IS Bindra | Mohali | Neutral | Best pace bowling venue |

Each venue has 6 traits: `paceAdvantage`, `battingFriendly`, `groundSize`, `dewFactor`, `spinLater`, `avgFirstInnings`.

### Match Simulation Model

```
Win Probability = 0.7 * skillProb + 0.3 * 0.5
```

Where `skillProb` is a logistic function of adjusted team strengths. Adjustments:
- Pace bowler count * venue pace advantage
- Spin bowler count * venue spin advantage
- Batting strength * batting-friendly venue bonus
- 5% home team multiplier

### AI Predictor Agents

Default agents (via OpenRouter):

| Agent | Model | Role |
|---|---|---|
| Claude-Oracle | anthropic/claude-sonnet-4 | Primary predictor |
| GPT-Forecaster | openai/gpt-4o | Cross-model comparison |
| Gemini-Seer | google/gemini-2.5-flash | Speed vs quality trade-off |
| Claude-Analyst | anthropic/claude-sonnet-4 | Consistency baseline |

Each agent receives per match:
- Teams playing (with strengths)
- Venue details and characteristics
- All previous match results
- Home/away context

Must respond in structured format: PREDICTION, CONFIDENCE (0.50-0.95), MARGIN, FACTORS, REASONING.

### TourBench Graders (6 metrics)

| Grader | Weight | What It Measures |
|---|---|---|
| Accuracy | 0.25 | % of correct winner predictions |
| Brier Score | 0.20 | Calibration quality (lower = better) |
| Confidence Calibration | 0.15 | High-confidence picks are more accurate |
| Upset Detection | 0.10 | Correctly predicting weaker team wins |
| Margin Accuracy | 0.10 | Predicted vs actual margin closeness |
| Consistency | 0.10 | Confidence aligns with correctness |
| Reasoning Quality | 0.10 | (Placeholder for model grader) |

**Composite Score** = weighted sum of all metrics, normalized to 0-1.

---

## Integration: AuctionBench + TourBench

The full pipeline:

1. **AuctionBench** — Agents build squads through auction
2. **TourBench** — Same/different agents predict tournament outcomes using those squads
3. **Cross-evaluation** — Did the agent who built the best squad also predict most accurately?

This creates a closed-loop eval: strategic execution (auction) + predictive reasoning (tournament) on the same domain.

---

## API Reference

### AuctionBench Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/agents/register` | Register a new agent |
| POST | `/api/v1/auctions/run` | Run full automated auction |
| POST | `/api/v1/auctions/create` | Create auction lobby |
| POST | `/api/v1/auctions/{id}/join` | Join an auction |
| GET | `/api/v1/auctions/{id}/state` | Get current auction state |
| POST | `/api/v1/auctions/{id}/bid` | Place bid or pass |
| GET | `/api/v1/auctions/{id}/results` | Get auction results |
| GET | `/api/v1/auctions` | List all auctions |

### TourBench Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/tournaments/run` | Run full tournament with predictions |
| POST | `/api/v1/tournaments/setup` | Create tournament in PENDING state (for external agents) |
| POST | `/api/v1/tournaments/{id}/start` | Start predictions on a pre-created tournament |
| POST | `/api/v1/tournaments/{id}/external/register` | Register external agent slot, get API token |
| GET | `/api/v1/tournaments/{id}/external/state?token=` | Poll for match prompt when it's your turn |
| POST | `/api/v1/tournaments/{id}/external/predict?token=` | Submit prediction for current match |
| GET | `/api/v1/tournaments` | List all tournaments |
| GET | `/api/v1/tournaments/{id}/results` | Get tournament results + evaluation |

### Environment Variables

```env
OPENROUTER_API_KEY=your_openrouter_api_key
```

Required for TourBench (AI agent predictions) and AuctionBench automated mode.

---

## Tech Stack

- **Next.js 16** (App Router) + TypeScript
- **Prisma v7** + SQLite (via better-sqlite3 adapter)
- **Tailwind CSS v4** (inline styles for reliability)
- **OpenRouter** for multi-model LLM access
- **Recharts** for data visualization
- **Framer Motion** for animations

## Project Structure

```
src/
  app/
    api/v1/
      agents/          # Agent registration
      auctions/        # AuctionBench API
      tournaments/     # TourBench API
    auction/[id]/      # Auction replay viewer
    results/[id]/      # Auction results dashboard
    tournaments/       # Tournament list
    tournaments/[id]/  # Tournament detail viewer
    arena/             # Arena live replay
    compare/           # Agent comparison (planned)
    about/             # Platform info
  components/
    Navbar.tsx         # Main navigation
  data/
    team-config.ts     # MI, CSK, RCB, KKR config
  lib/
    db.ts              # Prisma client
    orchestrator.ts    # AuctionBench orchestrator
    graders.ts         # AuctionBench graders
    tour/
      tournament-engine.ts  # Match simulation
      tour-orchestrator.ts  # Agent prediction pipeline
      tour-scoring.ts       # TourBench graders
      venue-system.ts       # Venue characteristics
prisma/
  schema.prisma        # Full DB schema
docs/
  SKILL.md             # This file
```
