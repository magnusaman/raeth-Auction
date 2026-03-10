import { prisma } from "../db";
import { GraderResult, TeamEvaluation, EvaluationResults, SeasonSimResult } from "../types";
import { TEAMS } from "@/data/team-config";
import {
  gradeBudgetEfficiency,
  gradeValuationAccuracy,
  gradeSquadBalance,
  gradeOverseasOptimization,
  gradeOverbidPenalty,
  gradePassDiscipline,
  gradeConstraintCompliance,
  gradePurseManagement,
  gradeTrapResistance,
  gradeValueDiscovery,
} from "./code-graders";

// ─── Run Full Evaluation ─────────────────────────────────────

export async function runFullEvaluation(auctionId: string): Promise<EvaluationResults> {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      teams: {
        include: {
          agent: true,
          wonPlayers: true,
        },
        orderBy: { teamIndex: "asc" },
      },
      players: true,
    },
  });

  if (!auction) throw new Error("Auction not found");

  const totalSleepers = auction.players.filter((p) => p.isSleeper).length;

  const teamEvals: TeamEvaluation[] = [];

  for (const team of auction.teams) {
    const playersBought = team.wonPlayers.map((p) => ({
      pricePaid: p.soldPrice || 0,
      trueValue: p.hiddenTrueValue,
      impactScore: (JSON.parse(p.hiddenSeasonPerf) as any).impactScore || 0,
      isTrap: p.isTrap,
      isSleeper: p.isSleeper,
      role: p.role,
      nationality: p.nationality,
    }));

    const purseSpent = 100 - team.purseRemaining;

    // Role counts
    const roleCounts: Record<string, number> = {};
    team.wonPlayers.forEach((p) => {
      roleCounts[p.role] = (roleCounts[p.role] || 0) + 1;
    });

    // Overseas players
    const overseasPlayers = playersBought.filter((p) => p.nationality !== "India");

    // Run all code graders
    const codeGraderScores: GraderResult[] = [
      gradeBudgetEfficiency(purseSpent, 100, team.squadSize, 15),
      gradeValuationAccuracy(playersBought),
      gradeSquadBalance(roleCounts, { batsmen: 5, bowlers: 5, allRounders: 3, keepers: 2 }),
      gradeOverseasOptimization(overseasPlayers, 8),
      gradeOverbidPenalty(playersBought),
      await gradePassDiscipline(auctionId, team.id),
      gradeConstraintCompliance(team.squadSize, team.overseasCount, team.purseRemaining, {
        minSquad: 15,
        maxSquad: 18,
        maxOverseas: 8,
      }),
      await gradePurseManagement(auctionId, team.id),
      gradeTrapResistance(playersBought),
      gradeValueDiscovery(playersBought, totalSleepers),
    ];

    // Composite score (weighted average of code graders)
    const weights: Record<string, number> = {
      budget_efficiency: 0.1,
      valuation_accuracy: 0.15,
      squad_balance: 0.15,
      overseas_optimization: 0.08,
      overbid_penalty: 0.12,
      pass_discipline: 0.1,
      constraint_compliance: 0.1,
      purse_management: 0.08,
      trap_resistance: 0.06,
      value_discovery: 0.06,
    };

    let compositeScore = 0;
    for (const grader of codeGraderScores) {
      const weight = weights[grader.graderName] || 0.05;
      compositeScore += grader.score * weight;
    }

    // Find best/worst decisions
    const lots = await prisma.lot.findMany({
      where: { auctionId },
      include: {
        bids: { where: { teamId: team.id } },
        player: true,
      },
      orderBy: { lotNumber: "asc" },
    });

    let bestDecision = { lotNumber: 0, description: "N/A" };
    let worstDecision = { lotNumber: 0, description: "N/A" };
    let bestScore = -Infinity;
    let worstScore = Infinity;

    for (const lot of lots) {
      const teamBids = lot.bids;
      if (teamBids.length === 0) continue;

      const hasBid = teamBids.some((b) => b.action === "bid");
      const won = lot.winnerId === team.id;

      if (won && lot.finalPrice) {
        const valueDiff = lot.player.hiddenTrueValue - lot.finalPrice;
        if (valueDiff > bestScore) {
          bestScore = valueDiff;
          bestDecision = {
            lotNumber: lot.lotNumber,
            description: `Bought ${lot.player.name} for ₹${lot.finalPrice} Cr (true value: ₹${lot.player.hiddenTrueValue.toFixed(1)} Cr) — saved ₹${valueDiff.toFixed(1)} Cr`,
          };
        }
        if (valueDiff < worstScore) {
          worstScore = valueDiff;
          worstDecision = {
            lotNumber: lot.lotNumber,
            description: `Bought ${lot.player.name} for ₹${lot.finalPrice} Cr (true value: ₹${lot.player.hiddenTrueValue.toFixed(1)} Cr) — overpaid ₹${Math.abs(valueDiff).toFixed(1)} Cr`,
          };
        }
      }

      // Passing on a trap = good decision
      if (!won && lot.player.isTrap && hasBid) {
        const bidAmt = Math.max(...teamBids.filter((b) => b.amount).map((b) => b.amount!));
        if (bidAmt < lot.player.hiddenTrueValue * 1.5) {
          const saved = (lot.finalPrice || lot.player.basePrice) - bidAmt;
          if (saved > bestScore) {
            bestScore = saved;
            bestDecision = {
              lotNumber: lot.lotNumber,
              description: `Correctly stopped bidding on trap player ${lot.player.name}`,
            };
          }
        }
      }
    }

    teamEvals.push({
      teamId: team.id,
      teamIndex: team.teamIndex,
      agentName: team.agent.name,
      codeGraderScores,
      modelGraderScores: [], // Will be filled by model graders
      compositeScore: Math.round(compositeScore * 1000) / 1000,
      rank: 0, // Set after sorting
      highlights: { bestDecision, worstDecision },
    });
  }

  // Sort and assign ranks
  teamEvals.sort((a, b) => b.compositeScore - a.compositeScore);
  teamEvals.forEach((t, i) => (t.rank = i + 1));

  // Run season simulation
  const seasonSim = simulateSeason(auction.teams, auction.players);

  const results: EvaluationResults = {
    auctionId,
    teamEvaluations: teamEvals,
    winner: {
      teamId: teamEvals[0].teamId,
      teamIndex: teamEvals[0].teamIndex,
      agentName: teamEvals[0].agentName,
      score: teamEvals[0].compositeScore,
    },
    seasonSimulation: seasonSim,
  };

  // Save to database
  await prisma.evaluation.upsert({
    where: { auctionId },
    create: {
      auctionId,
      results: JSON.stringify(results),
      seasonSim: JSON.stringify(seasonSim),
    },
    update: {
      results: JSON.stringify(results),
      seasonSim: JSON.stringify(seasonSim),
    },
  });

  return results;
}

// ─── Season Simulation (DETERMINISTIC) ──────────────────────

function simulateSeason(
  teams: any[],
  allPlayers: any[]
): SeasonSimResult {
  // Calculate team strength from hidden true value (Dream11-based)
  const teamStrengths = teams.map((team) => {
    const players = allPlayers.filter((p) => p.wonByTeamId === team.id);
    let totalValue = 0;
    for (const p of players) {
      totalValue += p.hiddenTrueValue || 0;
    }
    return {
      teamIndex: team.teamIndex,
      teamId: team.id,
      strength: totalValue,
    };
  });

  // Round-robin: each team plays each other twice (home + away)
  const matchResults: SeasonSimResult["matchResults"] = [];
  const standings = teamStrengths.map((t) => ({
    teamIndex: t.teamIndex,
    played: 0,
    won: 0,
    lost: 0,
    nrr: 0,
    points: 0,
  }));

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      for (let match = 0; match < 2; match++) {
        const s1 = teamStrengths[i].strength;
        const s2 = teamStrengths[j].strength;
        const diff = Math.abs(s1 - s2);

        // DETERMINISTIC: stronger team always wins
        const team1Wins = s1 >= s2;
        const winnerIdx = team1Wins ? teamStrengths[i].teamIndex : teamStrengths[j].teamIndex;
        const loserIdx = team1Wins ? teamStrengths[j].teamIndex : teamStrengths[i].teamIndex;

        // Margin from strength differential
        let margin: string;
        if (diff > 20) margin = `${Math.min(9, Math.round(diff / 4))} wickets`;
        else if (diff > 5) margin = `${Math.round(diff * 2)} runs`;
        else if (diff > 0) margin = `${Math.max(1, Math.round(diff))} wickets`;
        else margin = "Super Over";

        matchResults.push({
          team1Index: teamStrengths[i].teamIndex,
          team2Index: teamStrengths[j].teamIndex,
          winnerIndex: winnerIdx,
          margin,
        });

        const winnerStanding = standings.find((s) => s.teamIndex === winnerIdx)!;
        const loserStanding = standings.find((s) => s.teamIndex === loserIdx)!;

        // NRR derived from strength differential (deterministic)
        const nrrDelta = Math.round((diff / 10) * 100) / 100 || 0.1;

        winnerStanding.played++;
        winnerStanding.won++;
        winnerStanding.points += 2;
        winnerStanding.nrr += nrrDelta;

        loserStanding.played++;
        loserStanding.lost++;
        loserStanding.nrr -= nrrDelta;
      }
    }
  }

  // Round NRR
  standings.forEach((s) => {
    s.nrr = Math.round(s.nrr * 100) / 100;
  });

  // Sort by points then NRR
  standings.sort((a, b) => b.points - a.points || b.nrr - a.nrr);

  return { standings, matchResults };
}
