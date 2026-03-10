// Stat distributions derived from IPL 2024-25 data
// Each distribution: { mean, std, min, max }
// Used to generate synthetic players with realistic stat ranges

export interface StatDistribution {
  mean: number;
  std: number;
  min: number;
  max: number;
}

// ─── Batting Stats ───────────────────────────────────────────

export const BATTING_STATS = {
  topOrder: {
    matches: { mean: 85, std: 40, min: 15, max: 200 },
    innings: { mean: 80, std: 38, min: 12, max: 190 },
    runs: { mean: 2200, std: 1200, min: 300, max: 6500 },
    avg: { mean: 30, std: 8, min: 15, max: 55 },
    strikeRate: { mean: 135, std: 15, min: 110, max: 175 },
    fifties: { mean: 14, std: 8, min: 1, max: 45 },
    hundreds: { mean: 1.5, std: 1.5, min: 0, max: 7 },
    boundaryPct: { mean: 55, std: 10, min: 35, max: 75 },
    dotPct: { mean: 32, std: 6, min: 20, max: 45 },
  },
  middleOrder: {
    matches: { mean: 70, std: 35, min: 10, max: 180 },
    innings: { mean: 60, std: 30, min: 8, max: 160 },
    runs: { mean: 1500, std: 900, min: 200, max: 4500 },
    avg: { mean: 27, std: 7, min: 14, max: 48 },
    strikeRate: { mean: 145, std: 18, min: 115, max: 190 },
    fifties: { mean: 8, std: 5, min: 0, max: 30 },
    hundreds: { mean: 0.5, std: 0.8, min: 0, max: 3 },
    boundaryPct: { mean: 60, std: 12, min: 38, max: 80 },
    dotPct: { mean: 28, std: 7, min: 15, max: 42 },
  },
  finisher: {
    matches: { mean: 65, std: 30, min: 10, max: 160 },
    innings: { mean: 55, std: 28, min: 8, max: 140 },
    runs: { mean: 1100, std: 700, min: 150, max: 3500 },
    avg: { mean: 25, std: 8, min: 12, max: 45 },
    strikeRate: { mean: 155, std: 20, min: 120, max: 210 },
    fifties: { mean: 5, std: 4, min: 0, max: 20 },
    hundreds: { mean: 0.2, std: 0.5, min: 0, max: 2 },
    boundaryPct: { mean: 65, std: 10, min: 42, max: 85 },
    dotPct: { mean: 25, std: 6, min: 12, max: 38 },
  },
};

// ─── Bowling Stats ───────────────────────────────────────────

export const BOWLING_STATS = {
  pace: {
    matches: { mean: 75, std: 35, min: 10, max: 180 },
    wickets: { mean: 80, std: 45, min: 8, max: 200 },
    bowlingAvg: { mean: 26, std: 6, min: 16, max: 40 },
    economy: { mean: 8.2, std: 1.0, min: 6.5, max: 10.5 },
    bowlingSR: { mean: 19, std: 4, min: 12, max: 30 },
    dotBallPct: { mean: 42, std: 5, min: 30, max: 55 },
  },
  spin: {
    matches: { mean: 70, std: 35, min: 10, max: 170 },
    wickets: { mean: 70, std: 40, min: 6, max: 180 },
    bowlingAvg: { mean: 28, std: 7, min: 17, max: 42 },
    economy: { mean: 7.5, std: 1.0, min: 5.5, max: 9.8 },
    bowlingSR: { mean: 21, std: 5, min: 13, max: 34 },
    dotBallPct: { mean: 40, std: 5, min: 28, max: 52 },
  },
  deathBowler: {
    matches: { mean: 70, std: 30, min: 12, max: 170 },
    wickets: { mean: 75, std: 40, min: 10, max: 180 },
    bowlingAvg: { mean: 27, std: 6, min: 18, max: 38 },
    economy: { mean: 8.8, std: 1.2, min: 7.0, max: 11.0 },
    bowlingSR: { mean: 18, std: 4, min: 11, max: 28 },
    dotBallPct: { mean: 38, std: 5, min: 26, max: 50 },
  },
};

// ─── All-Rounder Stats ──────────────────────────────────────

export const ALLROUNDER_STATS = {
  battingAR: {
    batting: {
      matches: { mean: 80, std: 35, min: 15, max: 190 },
      runs: { mean: 1800, std: 900, min: 250, max: 5000 },
      avg: { mean: 26, std: 7, min: 14, max: 42 },
      strikeRate: { mean: 142, std: 18, min: 110, max: 185 },
    },
    bowling: {
      wickets: { mean: 45, std: 25, min: 5, max: 120 },
      economy: { mean: 8.5, std: 1.2, min: 6.8, max: 10.8 },
      bowlingAvg: { mean: 32, std: 8, min: 20, max: 48 },
    },
  },
  bowlingAR: {
    batting: {
      matches: { mean: 75, std: 30, min: 12, max: 180 },
      runs: { mean: 900, std: 600, min: 100, max: 3000 },
      avg: { mean: 20, std: 6, min: 10, max: 35 },
      strikeRate: { mean: 135, std: 20, min: 100, max: 175 },
    },
    bowling: {
      wickets: { mean: 70, std: 35, min: 8, max: 170 },
      economy: { mean: 7.8, std: 1.0, min: 6.0, max: 10.0 },
      bowlingAvg: { mean: 27, std: 6, min: 16, max: 40 },
    },
  },
};

// ─── Keeper Stats ────────────────────────────────────────────

export const KEEPER_STATS = {
  keeperBatsman: {
    matches: { mean: 75, std: 35, min: 10, max: 180 },
    innings: { mean: 70, std: 33, min: 8, max: 170 },
    runs: { mean: 1800, std: 1000, min: 200, max: 5000 },
    avg: { mean: 28, std: 7, min: 14, max: 48 },
    strikeRate: { mean: 138, std: 16, min: 110, max: 180 },
    catches: { mean: 45, std: 25, min: 5, max: 120 },
    stumpings: { mean: 15, std: 10, min: 1, max: 45 },
  },
};

// ─── Age Distribution ────────────────────────────────────────

export const AGE_DISTRIBUTION = {
  youngster: { mean: 21, std: 1.5, min: 18, max: 23 },    // ~20% of pool
  prime: { mean: 27, std: 2, min: 24, max: 31 },           // ~55% of pool
  veteran: { mean: 34, std: 2, min: 32, max: 38 },         // ~25% of pool
};

// ─── Base Price Tiers ────────────────────────────────────────

export const BASE_PRICE_TIERS = [
  { price: 0.5, weight: 30 },  // 30% at ₹0.5 Cr
  { price: 1.0, weight: 35 },  // 35% at ₹1 Cr
  { price: 1.5, weight: 20 },  // 20% at ₹1.5 Cr
  { price: 2.0, weight: 15 },  // 15% at ₹2 Cr
];
