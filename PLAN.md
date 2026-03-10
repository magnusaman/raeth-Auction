# Raeth Arena — AI Agent Evaluation Platform

## Overview

Two evaluation benchmarks on one platform:
- **AuctionBench**: Tests strategic decision-making through IPL-style player auctions
- **TourBench**: Tests predictive reasoning through tournament match prediction

Both grounded in Anthropic's "Demystifying Evals for AI Agents" methodology.

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                      RAETH ARENA                                │
├──────────────────┬─────────────────────────────────────────────┤
│   AUCTIONBENCH   │              TOURBENCH                      │
│                  │                                              │
│  Synthetic       │  Tournament     Match State                  │
│  Player Pool  →  │  Generator  →   Builder                     │
│                  │                                              │
│  Auction         │  Prediction     Confidence                  │
│  Engine       →  │  Engine      →  Calibration                 │
│                  │                                              │
│  Bid/Pass        │  Predict        Reasoning                   │
│  Decisions    →  │  Winners     →  Explanations                │
│                  │                                              │
│  10 Code         │  8 Code         Match Outcome               │
│  Graders      →  │  Graders     →  Verification                │
├──────────────────┴─────────────────────────────────────────────┤
│  Shared: Prisma DB │ OpenRouter │ Next.js Frontend │ REST API  │
└────────────────────────────────────────────────────────────────┘
```

## Teams

| Team | Short | Color | Logo |
|------|-------|-------|------|
| Mumbai Indians | MI | #004BA0 | 🏏 |
| Chennai Super Kings | CSK | #FDB913 | 🦁 |
| Royal Challengers | RCB | #EC1C24 | 👑 |
| Kolkata Knight Riders | KKR | #3A225D | ⚡ |

---

## TourBench Design

### Concept

After AuctionBench builds squads, TourBench runs a simulated tournament. AI agents must predict the winner of each match given:
- Both teams' full squad compositions (from auction results)
- Player stats (batting avg, SR, bowling avg, economy, etc.)
- Venue characteristics (pace-friendly, spin-friendly, ground size)
- Head-to-head implied strength
- Match context (league stage vs playoff, day vs night)

### Tournament Format

- **14 league matches** (each team plays every other team twice, home + away)
- **2 playoff matches** (Top 2 teams: Qualifier + Final)
- **Total: 16 matches** per tournament run

### What Agents Submit Per Match

```json
{
  "match_id": "m1",
  "predicted_winner": "MI",
  "confidence": 0.72,
  "predicted_margin": "6 wickets",
  "key_factors": [
    "MI has 3 quality death bowlers vs CSK's weak death bowling",
    "Venue favors pace; MI has 4 pace options"
  ],
  "reasoning": "Full paragraph of strategic reasoning..."
}
```

### Match Simulation (Ground Truth)

Each match outcome is determined by a **strength-based simulation**:
1. Calculate team strength from player hidden impact scores
2. Apply venue modifier (pace/spin advantage)
3. Apply home advantage (+5% win probability)
4. Add controlled randomness (70% skill, 30% luck)
5. Generate winner + margin

### TourBench Graders (8 total)

| # | Grader | Type | Weight | What It Tests |
|---|--------|------|--------|---------------|
| 1 | Prediction Accuracy | Code | 0.20 | % of matches predicted correctly |
| 2 | Brier Score | Code | 0.15 | Calibration — when you say 70%, does team win ~70% of the time? |
| 3 | Upset Detection | Code | 0.10 | Did you correctly predict any upsets (weaker team wins)? |
| 4 | Margin Accuracy | Code | 0.10 | How close was predicted margin to actual? |
| 5 | Confidence Calibration | Code | 0.10 | Are high-confidence picks more accurate than low-confidence? |
| 6 | Reasoning Quality | Model | 0.15 | Does the reasoning logically support the prediction? |
| 7 | Factor Relevance | Model | 0.10 | Are the key_factors actually relevant to match outcome? |
| 8 | Consistency | Code | 0.10 | Do predictions stay consistent with stated reasoning? |

### Integration with AuctionBench

TourBench can run in two modes:
1. **Standalone**: Uses pre-generated team squads
2. **Linked**: Uses squads built in a previous AuctionBench run — the teams you auction for then play in the tournament

This creates a full pipeline: **Build Squad → Predict Tournament → Evaluate Both**

### DB Schema Additions

```
Tournament (id, auctionId?, status, config, createdAt, completedAt)
TournamentMatch (id, tournamentId, matchNumber, team1Index, team2Index, venue, matchType, actualWinner, actualMargin, strengthData)
TournamentPrediction (id, matchId, agentId, predictedWinner, confidence, predictedMargin, keyFactors, reasoning, score)
TournamentEvaluation (id, tournamentId, results, createdAt)
```

### Venue System

8 venues with different characteristics:
- Wankhede (MI home): Pace-friendly, batting paradise, dew factor
- Chepauk (CSK home): Spin-friendly, low-scoring, cracks develop
- Chinnaswamy (RCB home): Small ground, high-scoring, batting heaven
- Eden Gardens (KKR home): Balanced, spin later, big crowd factor
- Plus 4 neutral venues with varying characteristics

### API Endpoints

```
POST /api/v1/tournaments/run       — Run full automated tournament
GET  /api/v1/tournaments           — List all tournaments
GET  /api/v1/tournaments/:id       — Tournament details + results
POST /api/v1/tournaments/:id/predict — Submit predictions
GET  /api/v1/tournaments/:id/results — Full evaluation
```

---

## File Structure

```
src/
  lib/
    tour/
      tournament-engine.ts    — Generate matches, simulate outcomes
      venue-system.ts         — Venue characteristics and modifiers
      tour-orchestrator.ts    — Run agents through predictions via OpenRouter
      tour-graders.ts         — 8 graders for prediction evaluation
      tour-scoring.ts         — Composite scoring and ranking
  app/
    api/v1/
      tournaments/
        route.ts              — List tournaments
        run/route.ts          — Trigger full run
        [id]/
          results/route.ts    — Get results
    tournament/
      [id]/page.tsx           — Tournament viewer (match cards, predictions)
    predictions/
      [id]/page.tsx           — Prediction evaluation dashboard
```
