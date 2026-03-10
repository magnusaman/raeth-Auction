// Dream11 T20 Fantasy Points Scoring Engine
// Used for deterministic tournament simulation — squad quality determines outcomes.

import { SyntheticPlayer, PlayerRole } from "./types";

export interface MatchPerformance {
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  wasDismissed: boolean;
  wickets: number;
  oversBowled: number;
  runsConceded: number;
  maidens: number;
  catches: number;
  stumpings: number;
  runOuts: number;
}

/**
 * Compute Dream11 fantasy points for a single match performance.
 */
export function computeDream11Points(perf: MatchPerformance, role: PlayerRole): number {
  let pts = 4; // Playing XI bonus

  // ── Batting ──
  pts += perf.runs;
  pts += perf.fours;       // boundary bonus
  pts += perf.sixes * 2;   // six bonus

  if (perf.runs >= 100) pts += 16;
  else if (perf.runs >= 50) pts += 8;

  // Duck penalty (not for pure bowlers)
  if (perf.runs === 0 && perf.wasDismissed && role !== "BOWLER") {
    pts -= 2;
  }

  // Strike rate bonus/penalty (min 10 balls)
  if (perf.ballsFaced >= 10) {
    const sr = (perf.runs / perf.ballsFaced) * 100;
    if (sr >= 170) pts += 6;
    else if (sr >= 150) pts += 4;
    else if (sr >= 130) pts += 2;
    else if (sr < 50) pts -= 6;
    else if (sr < 60) pts -= 4;
    else if (sr < 70) pts -= 2;
  }

  // ── Bowling ──
  pts += perf.wickets * 25;
  pts += perf.maidens * 8;

  if (perf.wickets >= 5) pts += 16;
  else if (perf.wickets >= 4) pts += 8;

  // Economy bonus/penalty (min 2 overs)
  if (perf.oversBowled >= 2) {
    const eco = perf.runsConceded / perf.oversBowled;
    if (eco < 5) pts += 6;
    else if (eco < 6) pts += 4;
    else if (eco < 7) pts += 2;
    else if (eco > 12) pts -= 6;
    else if (eco > 11) pts -= 4;
    else if (eco > 10) pts -= 2;
  }

  // ── Fielding ──
  pts += perf.catches * 8;
  pts += perf.stumpings * 12;
  pts += perf.runOuts * 12;

  return pts;
}

/**
 * Get the "Dream11 squad value" for a set of players.
 * Uses their hidden 2024 Dream11 avg points as the true measure.
 * Higher squad value = better team = should win deterministically.
 */
export function computeSquadValue(players: SyntheticPlayer[]): number {
  // Sum of all players' hidden true values (already in Crores based on Dream11 avg)
  return players.reduce((sum, p) => sum + p.hiddenTrueValue, 0);
}

/**
 * Compute the "playing XI" Dream11 value from a squad.
 * Selects best 11 players respecting constraints:
 *   - Max 4 overseas
 *   - At least 1 WK, 3 BAT, 3 BOWL, 1 AR
 */
export function computePlayingXIValue(squad: SyntheticPlayer[]): number {
  // Sort by hidden true value descending
  const sorted = [...squad].sort((a, b) => b.hiddenTrueValue - a.hiddenTrueValue);

  const xi: SyntheticPlayer[] = [];
  let overseas = 0;
  const roleCounts: Record<string, number> = {
    BATSMAN: 0, BOWLER: 0, ALL_ROUNDER: 0, WICKET_KEEPER: 0,
  };

  // First pass: fill minimum role requirements
  const mins: Record<string, number> = {
    WICKET_KEEPER: 1, BATSMAN: 3, BOWLER: 3, ALL_ROUNDER: 1,
  };

  for (const role of ["WICKET_KEEPER", "BOWLER", "ALL_ROUNDER", "BATSMAN"] as const) {
    const candidates = sorted.filter(
      (p) => p.role === role && !xi.includes(p) &&
             (p.nationality === "India" || overseas < 4)
    );
    const needed = mins[role];
    for (let i = 0; i < needed && i < candidates.length; i++) {
      xi.push(candidates[i]);
      roleCounts[role]++;
      if (candidates[i].nationality !== "India") overseas++;
    }
  }

  // Second pass: fill remaining spots (up to 11) with best available
  for (const p of sorted) {
    if (xi.length >= 11) break;
    if (xi.includes(p)) continue;
    if (p.nationality !== "India" && overseas >= 4) continue;
    xi.push(p);
    if (p.nationality !== "India") overseas++;
  }

  return xi.reduce((sum, p) => sum + p.hiddenTrueValue, 0);
}
