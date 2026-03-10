// Loads real IPL player data as SyntheticPlayer[] for the auction engine.
// Replaces player-generator.ts with real Cricsheet-derived data.

import { SyntheticPlayer } from "./types";
import { IPL_PLAYERS } from "@/data/ipl-players";

/**
 * Compute a visible quality score for auction ordering.
 * Best players go first, weakest last.
 */
function computeVisibleQuality(p: SyntheticPlayer): number {
  const cs = p.careerStats;
  const matchFactor = Math.min(1.3, (cs.matches || 1) / 25);
  let q = 0;

  if (p.role === "BATSMAN") {
    const avg = cs.battingAvg || 20;
    const sr = cs.strikeRate || 120;
    q = (avg / 30) * (sr / 135) * 5 * matchFactor;
    if (cs.hundreds && cs.hundreds > 1) q += 0.5;
    if (cs.fifties && cs.fifties > 3) q += 0.3;
  } else if (p.role === "BOWLER") {
    const econ = cs.economy || 9;
    const wickets = cs.wickets || 10;
    q = (8.5 / econ) * (wickets / 25) * 5 * matchFactor;
    if (cs.dotBallPct && cs.dotBallPct > 45) q += 0.4;
  } else if (p.role === "ALL_ROUNDER") {
    const avg = cs.battingAvg || 20;
    const sr = cs.strikeRate || 125;
    const econ = cs.economy || 9;
    q = ((avg / 25) * (sr / 135) * 2.5 + (econ ? (8.5 / econ) * 2.5 : 0)) * matchFactor;
  } else {
    const avg = cs.battingAvg || 20;
    const sr = cs.strikeRate || 125;
    q = (avg / 28) * (sr / 135) * 4.5 * matchFactor;
    if (cs.catches && cs.catches > 10) q += 0.3;
  }

  // Recent form boost
  const recentAvg = p.recentForm.reduce((s, r) => s + r.rating, 0) / (p.recentForm.length || 1);
  q += (recentAvg - 5) * 0.3;

  // Base price signal (scaled for IPL base price range 0.20-2.0 Cr)
  q += p.basePrice * 0.8;

  return Math.round(q * 100) / 100;
}

/**
 * Load the real IPL player pool, sorted by visible quality.
 * Drop-in replacement for generatePlayerPool().
 */
export function loadIPLPlayerPool(): SyntheticPlayer[] {
  const scored = IPL_PLAYERS.map((p) => ({
    player: p,
    quality: computeVisibleQuality(p),
  }));

  scored.sort((a, b) => b.quality - a.quality);

  // Slight shuffle within quality tiers for variety
  for (let i = 0; i < scored.length - 1; i++) {
    if (Math.random() < 0.15 && Math.abs(scored[i].quality - scored[i + 1].quality) < 1.0) {
      [scored[i], scored[i + 1]] = [scored[i + 1], scored[i]];
    }
  }

  return scored.map((s, idx) => ({
    ...s.player,
    auctionOrder: idx + 1,
    anonId: `PLAYER_${String(idx + 1).padStart(3, "0")}`,
  })) as (SyntheticPlayer & { auctionOrder: number })[];
}
