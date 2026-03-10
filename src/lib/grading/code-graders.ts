import { GraderResult } from "../types";
import { prisma } from "../db";

// ─── 1. Budget Efficiency ────────────────────────────────────
// How effectively was the purse utilized (not too much unspent, not overspent)

export function gradeBudgetEfficiency(
  purseSpent: number,
  totalPurse: number,
  squadSize: number,
  minSquadSize: number
): GraderResult {
  const spentPct = purseSpent / totalPurse;
  let score: number;

  if (squadSize < minSquadSize) {
    score = 0; // Failed to fill squad
  } else if (spentPct >= 0.85 && spentPct <= 0.98) {
    score = 1.0; // Ideal range
  } else if (spentPct >= 0.7) {
    score = 0.7 + (spentPct - 0.7) * 2; // Decent
  } else if (spentPct >= 0.5) {
    score = 0.3 + (spentPct - 0.5) * 2; // Underspent
  } else {
    score = spentPct * 0.6; // Very underspent
  }

  if (spentPct > 0.98) score = 0.95; // Cutting it too close

  return {
    graderName: "budget_efficiency",
    score: Math.max(0, Math.min(1, score)),
    details: `Spent ₹${purseSpent.toFixed(1)} Cr of ₹${totalPurse} Cr (${(spentPct * 100).toFixed(1)}%)`,
  };
}

// ─── 2. Valuation Accuracy ───────────────────────────────────
// How close were bids to the hidden true value

export function gradeValuationAccuracy(
  playersBought: { pricePaid: number; trueValue: number }[]
): GraderResult {
  if (playersBought.length === 0) {
    return { graderName: "valuation_accuracy", score: 0, details: "No players bought" };
  }

  let totalAccuracy = 0;
  const breakdowns: Record<string, number> = {};

  for (const p of playersBought) {
    const ratio = p.trueValue > 0 ? p.pricePaid / p.trueValue : 2;
    // Perfect = 1.0 (paid exactly true value)
    // Underpaid = ratio < 1 → good (up to 0.5x)
    // Overpaid = ratio > 1 → bad
    let accuracy: number;
    if (ratio <= 1) {
      accuracy = 0.7 + ratio * 0.3; // 0.7-1.0 for underpay
    } else if (ratio <= 1.5) {
      accuracy = 1.0 - (ratio - 1) * 1.2; // slight overpay
    } else if (ratio <= 2.5) {
      accuracy = 0.4 - (ratio - 1.5) * 0.3; // significant overpay
    } else {
      accuracy = 0.1;
    }

    totalAccuracy += Math.max(0, accuracy);
  }

  const score = totalAccuracy / playersBought.length;

  return {
    graderName: "valuation_accuracy",
    score: Math.max(0, Math.min(1, score)),
    details: `Average valuation accuracy across ${playersBought.length} players`,
    breakdown: breakdowns,
  };
}

// ─── 3. Squad Balance ────────────────────────────────────────
// Does the squad meet role minimums

export function gradeSquadBalance(
  roleCounts: Record<string, number>,
  requirements: { batsmen: number; bowlers: number; allRounders: number; keepers: number }
): GraderResult {
  const checks = [
    { have: roleCounts["BATSMAN"] || 0, need: requirements.batsmen, label: "Batsmen" },
    { have: roleCounts["BOWLER"] || 0, need: requirements.bowlers, label: "Bowlers" },
    { have: roleCounts["ALL_ROUNDER"] || 0, need: requirements.allRounders, label: "All-rounders" },
    { have: roleCounts["WICKET_KEEPER"] || 0, need: requirements.keepers, label: "Keepers" },
  ];

  let score = 0;
  const details: string[] = [];

  for (const check of checks) {
    const fulfilled = Math.min(check.have / check.need, 1);
    score += fulfilled * 0.25;
    if (check.have < check.need) {
      details.push(`${check.label}: ${check.have}/${check.need} ❌`);
    } else {
      details.push(`${check.label}: ${check.have}/${check.need} ✓`);
    }
  }

  return {
    graderName: "squad_balance",
    score,
    details: details.join(", "),
  };
}

// ─── 4. Overseas Optimization ────────────────────────────────
// Quality of overseas picks within the 8-slot limit

export function gradeOverseasOptimization(
  overseasPlayers: { pricePaid: number; trueValue: number; impactScore: number }[],
  maxOverseas: number
): GraderResult {
  if (overseasPlayers.length === 0) {
    return { graderName: "overseas_optimization", score: 0.3, details: "No overseas players" };
  }

  const avgImpact = overseasPlayers.reduce((s, p) => s + p.impactScore, 0) / overseasPlayers.length;
  const utilization = overseasPlayers.length / maxOverseas;

  // Score based on impact quality and slot utilization
  const impactScore = Math.min(1, avgImpact / 60); // 60+ impact = perfect
  const utilizationScore = utilization >= 0.5 ? 1 : utilization * 2;

  const score = impactScore * 0.7 + utilizationScore * 0.3;

  return {
    graderName: "overseas_optimization",
    score: Math.max(0, Math.min(1, score)),
    details: `${overseasPlayers.length} overseas players, avg impact: ${avgImpact.toFixed(1)}`,
  };
}

// ─── 5. Overbid Penalty ──────────────────────────────────────
// How much overpaid relative to true value (negative score = penalty)

export function gradeOverbidPenalty(
  playersBought: { pricePaid: number; trueValue: number }[]
): GraderResult {
  if (playersBought.length === 0) {
    return { graderName: "overbid_penalty", score: 0, details: "No players bought" };
  }

  let totalOverpay = 0;
  let worstOverpay = 0;

  for (const p of playersBought) {
    const overpay = Math.max(0, p.pricePaid - p.trueValue);
    totalOverpay += overpay;
    worstOverpay = Math.max(worstOverpay, overpay);
  }

  // Normalize: 0 overpay = score 0 (no penalty), high overpay = negative
  const avgOverpay = totalOverpay / playersBought.length;
  const score = -Math.min(1, avgOverpay / 5); // -1 if avg overpay >= 5 Cr

  return {
    graderName: "overbid_penalty",
    score,
    details: `Total overpay: ₹${totalOverpay.toFixed(1)} Cr, worst single: ₹${worstOverpay.toFixed(1)} Cr`,
  };
}

// ─── 6. Pass Discipline ──────────────────────────────────────
// Did the agent correctly pass on overpriced / unneeded players

export async function gradePassDiscipline(
  auctionId: string,
  teamId: string
): Promise<GraderResult> {
  const lots = await prisma.lot.findMany({
    where: { auctionId },
    include: {
      bids: { where: { teamId } },
      player: true,
    },
  });

  let correctPasses = 0;
  let totalPassOpportunities = 0;

  for (const lot of lots) {
    const player = lot.player;
    const teamBids = lot.bids;
    const hasBid = teamBids.some((b) => b.action === "bid");
    const lastBidAmount = lot.finalPrice || player.basePrice;

    // Should have passed if: trap player, or final price > 2x true value
    const shouldPass =
      player.isTrap || (lastBidAmount > player.hiddenTrueValue * 2);

    if (shouldPass) {
      totalPassOpportunities++;
      if (!hasBid || lot.winnerId !== teamId) {
        correctPasses++;
      }
    }
  }

  const score = totalPassOpportunities > 0
    ? correctPasses / totalPassOpportunities
    : 0.5; // neutral if no pass opportunities

  return {
    graderName: "pass_discipline",
    score,
    details: `${correctPasses}/${totalPassOpportunities} correct passes on overpriced/trap players`,
  };
}

// ─── 7. Constraint Compliance ────────────────────────────────
// Never violated auction rules (binary)

export function gradeConstraintCompliance(
  squadSize: number,
  overseasCount: number,
  purseRemaining: number,
  config: { minSquad: number; maxSquad: number; maxOverseas: number }
): GraderResult {
  const violations: string[] = [];

  if (squadSize < config.minSquad) violations.push(`Squad too small: ${squadSize}/${config.minSquad}`);
  if (squadSize > config.maxSquad) violations.push(`Squad too large: ${squadSize}/${config.maxSquad}`);
  if (overseasCount > config.maxOverseas) violations.push(`Too many overseas: ${overseasCount}/${config.maxOverseas}`);
  if (purseRemaining < 0) violations.push(`Purse overdrawn: ₹${purseRemaining} Cr`);

  return {
    graderName: "constraint_compliance",
    score: violations.length === 0 ? 1 : 0,
    details: violations.length === 0 ? "All constraints met" : violations.join("; "),
  };
}

// ─── 8. Purse Management ─────────────────────────────────────
// Maintained enough purse for remaining squad needs throughout

export async function gradePurseManagement(
  auctionId: string,
  teamId: string
): Promise<GraderResult> {
  // Check if team ever had a purse crisis (couldn't afford needed players)
  const team = await prisma.auctionTeam.findUnique({
    where: { id: teamId },
  });

  if (!team) {
    return { graderName: "purse_management", score: 0, details: "Team not found" };
  }

  // Simple: good score if ended with reasonable purse (2-15 Cr) and filled squad
  const remaining = team.purseRemaining;
  let score: number;

  if (remaining >= 2 && remaining <= 15) {
    score = 0.9; // Ideal
  } else if (remaining < 2) {
    score = 0.6; // Cut it close
  } else if (remaining <= 25) {
    score = 0.7; // Left some on table
  } else {
    score = 0.4; // Too much unspent
  }

  return {
    graderName: "purse_management",
    score,
    details: `₹${remaining.toFixed(1)} Cr remaining`,
  };
}

// ─── 9. Trap Resistance ──────────────────────────────────────
// Didn't overbid on trap players

export function gradeTrapResistance(
  playersBought: { isTrap: boolean; pricePaid: number; trueValue: number }[]
): GraderResult {
  const trapsBought = playersBought.filter((p) => p.isTrap);

  if (trapsBought.length === 0) {
    return {
      graderName: "trap_resistance",
      score: 1.0,
      details: "No trap players in squad — perfect avoidance",
    };
  }

  // Penalty based on how much spent on traps
  const trapSpend = trapsBought.reduce((s, p) => s + p.pricePaid, 0);
  const avgOverpay = trapsBought.reduce((s, p) => s + (p.pricePaid - p.trueValue), 0) / trapsBought.length;

  const score = Math.max(0, 1 - trapsBought.length * 0.25 - avgOverpay * 0.05);

  return {
    graderName: "trap_resistance",
    score,
    details: `${trapsBought.length} trap players bought, ₹${trapSpend.toFixed(1)} Cr spent on traps`,
  };
}

// ─── 10. Value Discovery ─────────────────────────────────────
// Found undervalued "sleeper" players

export function gradeValueDiscovery(
  playersBought: { isSleeper: boolean; pricePaid: number; trueValue: number; impactScore: number }[],
  totalSleepersInPool: number
): GraderResult {
  const sleepersFound = playersBought.filter((p) => p.isSleeper);

  if (totalSleepersInPool === 0) {
    return { graderName: "value_discovery", score: 0.5, details: "No sleepers in pool" };
  }

  const discoveryRate = sleepersFound.length / totalSleepersInPool;

  // Also reward buying any player below true value
  const undervalued = playersBought.filter((p) => p.pricePaid < p.trueValue * 0.8);
  const undervalueBonus = Math.min(0.3, undervalued.length * 0.05);

  const score = Math.min(1, discoveryRate * 0.7 + undervalueBonus + (sleepersFound.length > 0 ? 0.2 : 0));

  return {
    graderName: "value_discovery",
    score,
    details: `${sleepersFound.length}/${totalSleepersInPool} sleepers found, ${undervalued.length} undervalued picks`,
  };
}
