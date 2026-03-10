import { prisma } from "@/lib/db";

interface AgentScore {
  agentId: string;
  agentName: string;
  accuracy: number;
  brierScore: number;
  upsetDetection: number;
  marginAccuracy: number;
  confidenceCalibration: number;
  consistency: number;
  compositeScore: number;
  rank: number;
  predictions: {
    matchNumber: number;
    predicted: number;
    actual: number;
    correct: boolean;
    confidence: number;
    reasoning: string;
  }[];
}

// Brier score: measures calibration (lower is better, 0 = perfect)
function brierScore(predictions: { confidence: number; correct: boolean }[]): number {
  if (predictions.length === 0) return 1;
  const sum = predictions.reduce((s, p) => {
    const prob = p.correct ? p.confidence : 1 - p.confidence;
    return s + Math.pow(1 - prob, 2);
  }, 0);
  return sum / predictions.length;
}

// Confidence calibration: do high-confidence picks perform better?
function calibrationScore(predictions: { confidence: number; correct: boolean }[]): number {
  if (predictions.length < 4) return 0.5;

  // Split into high-confidence (>0.7) and low-confidence (<0.7)
  const highConf = predictions.filter((p) => p.confidence >= 0.7);
  const lowConf = predictions.filter((p) => p.confidence < 0.7);

  const highAcc = highConf.length > 0 ? highConf.filter((p) => p.correct).length / highConf.length : 0.5;
  const lowAcc = lowConf.length > 0 ? lowConf.filter((p) => p.correct).length / lowConf.length : 0.5;

  // Good calibration: high-confidence picks should be more accurate
  if (highConf.length === 0 || lowConf.length === 0) return 0.5;
  return highAcc > lowAcc ? Math.min(1, 0.5 + (highAcc - lowAcc)) : Math.max(0, 0.5 - (lowAcc - highAcc) * 0.5);
}

// Margin accuracy: how close is predicted margin to actual?
function marginScore(predictions: { predictedMargin: string; actualMargin: string }[]): number {
  let totalScore = 0;
  let count = 0;

  for (const p of predictions) {
    const predRuns = parseInt(p.predictedMargin);
    const actRuns = parseInt(p.actualMargin);

    if (!isNaN(predRuns) && !isNaN(actRuns)) {
      const diff = Math.abs(predRuns - actRuns);
      totalScore += Math.max(0, 1 - diff / 30); // 0 diff = 1.0, 30+ diff = 0.0
      count++;
    } else {
      // Check if both are "wickets" type or "Super Over"
      const predType = p.predictedMargin.includes("wicket") ? "wickets" : p.predictedMargin.includes("Super") ? "super" : "runs";
      const actType = p.actualMargin.includes("wicket") ? "wickets" : p.actualMargin.includes("Super") ? "super" : "runs";
      totalScore += predType === actType ? 0.5 : 0.2;
      count++;
    }
  }

  return count > 0 ? totalScore / count : 0.5;
}

// Upset detection: predicted weaker team wins and was correct
function upsetScore(predictions: { predicted: number; actual: number; confidence: number; t1Strength: number; t2Strength: number; team1: number }[]): number {
  let upsets = 0;
  let upsetsCaught = 0;

  for (const p of predictions) {
    const strongerTeam = p.t1Strength > p.t2Strength ? p.team1 : (p.team1 === p.predicted ? p.predicted : p.actual);
    const isUpset = p.actual !== strongerTeam;

    if (isUpset) {
      upsets++;
      if (p.predicted === p.actual) upsetsCaught++;
    }
  }

  if (upsets === 0) return 0.5;
  return upsetsCaught / upsets;
}

export async function runTourEvaluation(tournamentId: string): Promise<{
  agentScores: AgentScore[];
  tournamentSummary: any;
}> {
  const matches = await prisma.tournamentMatch.findMany({
    where: { tournamentId },
    include: { predictions: true },
    orderBy: { matchNumber: "asc" },
  });

  // Group predictions by agent
  const agentMap = new Map<string, {
    agentId: string;
    agentName: string;
    predictions: any[];
  }>();

  for (const match of matches) {
    for (const pred of match.predictions) {
      if (!agentMap.has(pred.agentId)) {
        agentMap.set(pred.agentId, {
          agentId: pred.agentId,
          agentName: pred.agentName,
          predictions: [],
        });
      }
      agentMap.get(pred.agentId)!.predictions.push({
        matchNumber: match.matchNumber,
        matchType: match.matchType,
        team1: match.team1Index,
        team2: match.team2Index,
        predicted: pred.predictedWinner,
        actual: match.actualWinner!,
        correct: pred.predictedWinner === match.actualWinner,
        confidence: pred.confidence,
        predictedMargin: pred.predictedMargin,
        actualMargin: match.actualMargin || "",
        reasoning: pred.reasoning,
        keyFactors: pred.keyFactors,
        t1Strength: match.team1Strength,
        t2Strength: match.team2Strength,
      });
    }
  }

  const agentScores: AgentScore[] = [];

  for (const [, agent] of agentMap) {
    const preds = agent.predictions;

    // 1. Accuracy (weight: 0.20)
    const correctCount = preds.filter((p) => p.correct).length;
    const accuracy = preds.length > 0 ? correctCount / preds.length : 0;

    // 2. Brier Score (weight: 0.15) — convert to 0-1 where 1 is best
    const brier = brierScore(preds.map((p) => ({ confidence: p.confidence, correct: p.correct })));
    const brierNormalized = Math.max(0, 1 - brier * 2); // 0 brier = 1.0 score

    // 3. Upset Detection (weight: 0.10)
    const upset = upsetScore(preds);

    // 4. Margin Accuracy (weight: 0.10)
    const margin = marginScore(preds.map((p) => ({ predictedMargin: p.predictedMargin, actualMargin: p.actualMargin })));

    // 5. Confidence Calibration (weight: 0.10)
    const calibration = calibrationScore(preds.map((p) => ({ confidence: p.confidence, correct: p.correct })));

    // 6. Consistency (weight: 0.10) — do predictions align with reasoning?
    // Proxy: agents with moderate confidence who are correct are more consistent
    const consistentCount = preds.filter((p) => {
      if (p.correct && p.confidence >= 0.6) return true;
      if (!p.correct && p.confidence < 0.6) return true;
      return false;
    }).length;
    const consistencyScore = preds.length > 0 ? consistentCount / preds.length : 0.5;

    // Composite (code graders only, model graders would add reasoning + factor relevance)
    const composite =
      accuracy * 0.25 +
      brierNormalized * 0.20 +
      upset * 0.10 +
      margin * 0.10 +
      calibration * 0.15 +
      consistencyScore * 0.10 +
      0.5 * 0.10; // placeholder for reasoning quality (model grader)

    agentScores.push({
      agentId: agent.agentId,
      agentName: agent.agentName,
      accuracy,
      brierScore: brier,
      upsetDetection: upset,
      marginAccuracy: margin,
      confidenceCalibration: calibration,
      consistency: consistencyScore,
      compositeScore: composite,
      rank: 0,
      predictions: preds.map((p) => ({
        matchNumber: p.matchNumber,
        predicted: p.predicted,
        actual: p.actual,
        correct: p.correct,
        confidence: p.confidence,
        reasoning: p.reasoning,
      })),
    });
  }

  // Rank
  agentScores.sort((a, b) => b.compositeScore - a.compositeScore);
  agentScores.forEach((a, i) => (a.rank = i + 1));

  // Tournament summary
  const tournamentSummary = {
    totalMatches: matches.length,
    leagueMatches: matches.filter((m) => m.matchType === "LEAGUE").length,
    playoffMatches: matches.filter((m) => m.matchType !== "LEAGUE").length,
    champion: matches.find((m) => m.matchType === "FINAL")?.actualWinner,
    matchResults: matches.map((m) => ({
      matchNumber: m.matchNumber,
      matchType: m.matchType,
      team1: m.team1Index,
      team2: m.team2Index,
      winner: m.actualWinner,
      margin: m.actualMargin,
      venue: m.venue,
    })),
  };

  // Save evaluation
  await prisma.tournamentEvaluation.create({
    data: {
      tournamentId,
      results: JSON.stringify({ agentScores, tournamentSummary }),
    },
  });

  return { agentScores, tournamentSummary };
}
