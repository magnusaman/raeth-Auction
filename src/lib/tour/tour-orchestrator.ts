import { prisma } from "@/lib/db";
import { createTournament, resolveTeamIndex } from "./tournament-engine";
import { runTourEvaluation } from "./tour-scoring";
import { TEAMS } from "@/data/team-config";
import { TEAMS_FULL } from "@/data/team-config-full";
import { SEASON_CONFIG, MATCHES_BY_YEAR, type SeasonId } from "@/data/ipl-seasons";
import type { IPLMatchResult } from "@/data/ipl-matches";
import type { TeamConfig } from "@/lib/types";
import { emitTournamentUpdate } from "@/lib/emit";

const DEFAULT_PREDICTORS = [
  { name: "Claude-Oracle", model: "anthropic/claude-sonnet-4.6" },
  { name: "GPT-Forecaster", model: "openai/gpt-5.4" },
  { name: "Gemini-Seer", model: "google/gemini-3.1-pro-preview" },
  { name: "DeepSeek-Analyst", model: "deepseek/deepseek-v3.2" },
];

/** Perturb a numeric stat by 1.1x to prevent fingerprinting */
function px(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === "?") return "?";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "?";
  return (Math.round(n * 1.1 * 100) / 100).toString();
}

function buildSquadSummary(squad: any, teamShort: string): string {
  if (!squad) return `  ${teamShort}: Squad data unavailable`;
  const rc = squad.roleCounts || {};
  // Anonymize player names — show role codes instead of real names
  const top = (squad.topPlayers || []).map((p: any, i: number) => `${teamShort}-P${i + 1} (${p.role})`).join(", ");
  return `  ${teamShort} (${squad.playerCount} players, ${squad.overseasCount} overseas):
    Composition: ${rc.batsmen || 0} BAT, ${rc.bowlers || 0} BOWL, ${rc.allRounders || 0} AR, ${rc.keepers || 0} WK
    Batting: Avg ${px(squad.avgBattingAvg)}, SR ${px(squad.avgStrikeRate)}
    Bowling: Avg Economy ${px(squad.avgEconomy)}
    Pace bowlers: ${squad.paceCount || 0} | Spinners: ${squad.spinCount || 0} | Power hitters: ${squad.powerHitters || 0}
    Key players: ${top || "N/A"}`;
}

/** Get match results from seasons visible to agents for this eval season */
function getVisibleHistory(seasonId: string): IPLMatchResult[] {
  const config = SEASON_CONFIG[seasonId as SeasonId];
  if (!config) return [];
  const history: IPLMatchResult[] = [];
  for (const year of config.visible) {
    const yearMatches = MATCHES_BY_YEAR[year];
    if (yearMatches) {
      history.push(...yearMatches);
    }
  }
  return history;
}

/** Parse score string like "173/6 (20)" → { runs: 173, wickets: 6, overs: 20 } */
function parseScore(s: string): { runs: number; wickets: number; overs: number } | null {
  const m = s.match(/(\d+)\/(\d+)\s*\(([\d.]+)\)/);
  if (!m) return null;
  return { runs: parseInt(m[1]), wickets: parseInt(m[2]), overs: parseFloat(m[3]) };
}

/** Compute team performance stats from a set of historical matches */
function computeTeamStats(teamIndex: number, matches: IPLMatchResult[]) {
  const teamMatches = matches.filter(
    (m) => resolveTeamIndex(m.team1) === teamIndex || resolveTeamIndex(m.team2) === teamIndex
  );
  if (teamMatches.length === 0) return null;

  let wins = 0;
  let totalBatRuns = 0, batInnings = 0;
  let totalBowlConceded = 0, bowlInnings = 0;
  let chasingWins = 0, chasingTotal = 0;

  for (const m of teamMatches) {
    const isTeam1 = resolveTeamIndex(m.team1) === teamIndex;
    const won = resolveTeamIndex(m.winner) === teamIndex;
    if (won) wins++;

    const batScore = parseScore(isTeam1 ? m.team1Score : m.team2Score);
    const bowlScore = parseScore(isTeam1 ? m.team2Score : m.team1Score);
    if (batScore) { totalBatRuns += batScore.runs; batInnings++; }
    if (bowlScore) { totalBowlConceded += bowlScore.runs; bowlInnings++; }

    // Check if team batted second (chasing)
    if (!isTeam1) { chasingTotal++; if (won) chasingWins++; }
  }

  // Per-season breakdown
  const seasonYears = [...new Set(teamMatches.map((m) => m.date.slice(0, 4)))].sort();
  const perSeason = seasonYears.map((yr) => {
    const yrMatches = teamMatches.filter((m) => m.date.startsWith(yr));
    const yrWins = yrMatches.filter((m) => resolveTeamIndex(m.winner) === teamIndex).length;
    return { year: yr, played: yrMatches.length, wins: yrWins };
  });

  return {
    played: teamMatches.length,
    wins,
    losses: teamMatches.length - wins,
    winRate: ((wins / teamMatches.length) * 100).toFixed(1),
    avgScore: batInnings > 0 ? (totalBatRuns / batInnings).toFixed(0) : "N/A",
    avgConceded: bowlInnings > 0 ? (totalBowlConceded / bowlInnings).toFixed(0) : "N/A",
    chasingWinRate: chasingTotal > 0 ? ((chasingWins / chasingTotal) * 100).toFixed(0) : "N/A",
    perSeason,
  };
}

/** Build team history summary for real data mode (replaces squad summary) */
function buildTeamHistorySummary(teamIndex: number, teamShort: string, visibleMatches: IPLMatchResult[]): string {
  const stats = computeTeamStats(teamIndex, visibleMatches);
  if (!stats || stats.played === 0) return `  ${teamShort}: No prior season data available`;

  const seasonBreakdown = stats.perSeason
    .map((s) => `${s.year}: ${s.played}M ${s.wins}W (${((s.wins / s.played) * 100).toFixed(0)}%)`)
    .join(" | ");

  return `  ${teamShort}:
    Overall: ${stats.played} matches, ${stats.wins}W ${stats.losses}L (${stats.winRate}% win rate)
    Avg batting score: ${stats.avgScore} | Avg conceded: ${stats.avgConceded}
    Chasing win rate: ${stats.chasingWinRate}%
    By season: ${seasonBreakdown}`;
}

/** Compute head-to-head from visible history between two teams */
function h2hFromHistory(t1Idx: number, t2Idx: number, visibleMatches: IPLMatchResult[]): { t1Wins: number; t2Wins: number; total: number } {
  const h2h = visibleMatches.filter((m) => {
    const a = resolveTeamIndex(m.team1), b = resolveTeamIndex(m.team2);
    return (a === t1Idx && b === t2Idx) || (a === t2Idx && b === t1Idx);
  });
  const t1Wins = h2h.filter((m) => resolveTeamIndex(m.winner) === t1Idx).length;
  return { t1Wins, t2Wins: h2h.length - t1Wins, total: h2h.length };
}

// Key players per IPL team — used in real data mode prompts
const TEAM_KEY_PLAYERS: Record<number, string[]> = {
  0: ["MS Dhoni (WK)", "Ruturaj Gaikwad", "Ravindra Jadeja", "Deepak Chahar", "Moeen Ali", "Devon Conway"],
  1: ["Rohit Sharma (C)", "Jasprit Bumrah", "Suryakumar Yadav", "Ishan Kishan (WK)", "Tim David"],
  2: ["Virat Kohli", "Faf du Plessis", "Glenn Maxwell", "Mohammed Siraj", "Dinesh Karthik (WK)"],
  3: ["Shreyas Iyer (C)", "Andre Russell", "Sunil Narine", "Venkatesh Iyer", "Varun Chakravarthy"],
  4: ["Travis Head", "Heinrich Klaasen (WK)", "Pat Cummins (C)", "Bhuvneshwar Kumar", "Abhishek Sharma"],
  5: ["Sanju Samson (WK/C)", "Jos Buttler", "Yashasvi Jaiswal", "Yuzvendra Chahal", "Trent Boult"],
  6: ["Rishabh Pant (WK/C)", "David Warner", "Axar Patel", "Kuldeep Yadav", "Anrich Nortje"],
  7: ["Shikhar Dhawan (C)", "Liam Livingstone", "Kagiso Rabada", "Arshdeep Singh", "Sam Curran"],
  8: ["Shubman Gill (C)", "Rashid Khan", "David Miller", "Mohammed Shami", "Wriddhiman Saha (WK)"],
  9: ["KL Rahul (C/WK)", "Quinton de Kock", "Marcus Stoinis", "Ravi Bishnoi", "Avesh Khan"],
};

function buildMatchPrompt(match: any, allMatches: any[], teamSquads: any[], teams: TeamConfig[], visibleHistory?: IPLMatchResult[]): string {
  const traits = JSON.parse(match.venueTraits || "{}");
  const isRealData = !!visibleHistory;

  // For real data: use REAL team names + venue. For synthetic: use fictional aliases.
  const t1Short = isRealData ? teams[match.team1Index].shortName : teams[match.team1Index].promptShort;
  const t2Short = isRealData ? teams[match.team2Index].shortName : teams[match.team2Index].promptShort;
  const t1Name = isRealData ? teams[match.team1Index].name : teams[match.team1Index].promptAlias;
  const t2Name = isRealData ? teams[match.team2Index].name : teams[match.team2Index].promptAlias;

  const teamLabel = (idx: number) => isRealData ? teams[idx].shortName : teams[idx].promptShort;

  const pastMatches = allMatches
    .filter((m) => m.matchNumber < match.matchNumber && m.actualWinner !== null)
    .map((m) => `  Match ${m.matchNumber}: ${teamLabel(m.team1Index)} vs ${teamLabel(m.team2Index)} → ${teamLabel(m.actualWinner!)} won by ${m.actualMargin}`)
    .join("\n");

  // Head-to-head between these two teams
  const h2hMatches = allMatches.filter(
    (m) =>
      m.matchNumber < match.matchNumber &&
      m.actualWinner !== null &&
      ((m.team1Index === match.team1Index && m.team2Index === match.team2Index) ||
        (m.team1Index === match.team2Index && m.team2Index === match.team1Index))
  );
  const h2hT1Wins = h2hMatches.filter((m) => m.actualWinner === match.team1Index).length;
  const h2hT2Wins = h2hMatches.filter((m) => m.actualWinner === match.team2Index).length;

  // Team form (last 5 results for each team)
  const getTeamForm = (teamIdx: number) => {
    return allMatches
      .filter(
        (m) =>
          m.matchNumber < match.matchNumber &&
          m.actualWinner !== null &&
          (m.team1Index === teamIdx || m.team2Index === teamIdx)
      )
      .slice(-5)
      .map((m) => (m.actualWinner === teamIdx ? "W" : "L"))
      .join("");
  };

  // Points table
  const standingsMap: Record<number, { w: number; l: number }> = {};
  for (const m of allMatches) {
    if (!(m.team1Index in standingsMap)) standingsMap[m.team1Index] = { w: 0, l: 0 };
    if (!(m.team2Index in standingsMap)) standingsMap[m.team2Index] = { w: 0, l: 0 };
  }
  for (const m of allMatches) {
    if (m.matchNumber >= match.matchNumber || m.actualWinner === null || m.matchType !== "LEAGUE") continue;
    standingsMap[m.actualWinner].w++;
    const loser = m.actualWinner === m.team1Index ? m.team2Index : m.team1Index;
    standingsMap[loser].l++;
  }
  const pointsTable = Object.entries(standingsMap)
    .map(([idx, s]) => ({ idx: Number(idx), pts: s.w * 2, w: s.w, l: s.l }))
    .sort((a, b) => b.pts - a.pts)
    .map((s, rank) => `  ${rank + 1}. ${teamLabel(s.idx)}: ${s.pts} pts (${s.w}W ${s.l}L)`)
    .join("\n");

  // Squad / history section
  const t1Squad = teamSquads.find((s: any) => s.teamIndex === match.team1Index);
  const t2Squad = teamSquads.find((s: any) => s.teamIndex === match.team2Index);

  let teamStrengthSection: string;
  if (isRealData && visibleHistory) {
    // Real data mode: team history + key players
    const t1Players = TEAM_KEY_PLAYERS[match.team1Index]?.join(", ") || "N/A";
    const t2Players = TEAM_KEY_PLAYERS[match.team2Index]?.join(", ") || "N/A";
    teamStrengthSection = `═══ TEAM PERFORMANCE HISTORY (prior IPL seasons) ═══
${buildTeamHistorySummary(match.team1Index, t1Short, visibleHistory)}
    Key players: ${t1Players}
${buildTeamHistorySummary(match.team2Index, t2Short, visibleHistory)}
    Key players: ${t2Players}`;
  } else {
    teamStrengthSection = `═══ SQUAD COMPOSITION ═══
${buildSquadSummary(t1Squad, t1Short)}
${buildSquadSummary(t2Squad, t2Short)}`;
  }

  // Historical head-to-head (from visible seasons)
  let histH2hSection = "";
  if (isRealData && visibleHistory) {
    const hist = h2hFromHistory(match.team1Index, match.team2Index, visibleHistory);
    if (hist.total > 0) {
      histH2hSection = `\n═══ HISTORICAL HEAD-TO-HEAD (prior IPL seasons) ═══
  ${t1Short} ${hist.t1Wins} - ${hist.t2Wins} ${t2Short} (${hist.total} matches)`;
    }
  }

  // Venue description
  const venueDesc = [
    traits.paceAdvantage > 0.3 ? "pace-friendly" : traits.paceAdvantage < -0.3 ? "spin-friendly" : "balanced pitch",
    traits.battingFriendly > 0.7 ? "batting-friendly" : traits.battingFriendly < 0.4 ? "bowler-dominant" : "even contest",
    traits.groundSize < 0.4 ? "small ground" : traits.groundSize > 0.7 ? "large ground" : "medium ground",
  ].join(", ");

  // Real venue name for real data mode
  const venueLine = isRealData
    ? `${match.venue} — ${venueDesc}`
    : `Venue ${match.matchNumber} — ${venueDesc}`;

  const homeTeamLabel = match.homeTeamIndex !== null && teams[match.homeTeamIndex]
    ? teamLabel(match.homeTeamIndex)
    : null;

  // ─── Build prompt: different framing for real vs synthetic ───
  if (isRealData) {
    return `You are an expert IPL cricket analyst. Predict the winner of this T20 match.

Use ALL available information — your cricket knowledge of these teams and players, the stats provided below, venue conditions, current form, head-to-head records, and standings context.
Be data-driven. Higher confidence only when multiple factors clearly align.

MATCH ${match.matchNumber}
${t1Name} (${t1Short}) vs ${t2Name} (${t2Short})

═══ VENUE ═══
${venueLine}
- Pace/Spin: ${traits.paceAdvantage > 0.3 ? "Strong pace advantage" : traits.paceAdvantage > 0 ? "Slight pace advantage" : traits.paceAdvantage < -0.3 ? "Strong spin advantage" : traits.paceAdvantage < 0 ? "Slight spin advantage" : "Balanced"}
- Batting conditions: ${traits.battingFriendly > 0.8 ? "Run-fest (200+ expected)" : traits.battingFriendly > 0.6 ? "Batting-friendly" : traits.battingFriendly < 0.4 ? "Bowler-dominant" : "Balanced"} | Avg 1st innings: ${traits.avgFirstInnings}
- Boundaries: ${traits.groundSize < 0.35 ? "Very small (favors big hitters)" : traits.groundSize < 0.5 ? "Small-medium" : traits.groundSize > 0.75 ? "Very large (favors placement)" : "Medium-large"}
- Dew: ${traits.dewFactor > 0.7 ? "Heavy (big chasing advantage)" : traits.dewFactor > 0.4 ? "Moderate" : "Minimal"}
${homeTeamLabel ? `🏟️ HOME ADVANTAGE: ${homeTeamLabel}` : "🏟️ NEUTRAL VENUE"}

${teamStrengthSection}

═══ CURRENT STANDINGS ═══
${pointsTable || "  Season not yet started"}

═══ HEAD-TO-HEAD (this season) ═══
${h2hMatches.length > 0 ? `  ${t1Short} ${h2hT1Wins} - ${h2hT2Wins} ${t2Short}` : "  No previous meetings this season"}${histH2hSection}

═══ RECENT FORM (last 5) ═══
  ${t1Short}: ${getTeamForm(match.team1Index) || "No matches yet"}
  ${t2Short}: ${getTeamForm(match.team2Index) || "No matches yet"}

═══ SEASON RESULTS SO FAR ═══
${pastMatches || "  Season opener — no results yet"}

Consider: team strengths/weaknesses, player matchups at this venue, historical IPL performance, squad balance (batting depth, bowling variety, death bowling), captaincy, and pressure situations.

RESPOND EXACTLY IN THIS FORMAT:
PREDICTION: [${t1Short} or ${t2Short}]
CONFIDENCE: [0.50 to 0.95]
MARGIN: [e.g. "5 wickets" or "22 runs" or "Super Over"]
FACTORS:
- [Key factor 1]
- [Key factor 2]
- [Key factor 3]
REASONING: [2-3 sentence analysis]`;
  }

  // Synthetic mode — keep fictional aliases, restrict external knowledge
  return `You are an expert cricket analyst predicting a T20 match outcome in the Blitz Premier League.
Analyze ALL available data — team history, venue conditions, form, head-to-head, and standings — before making your prediction.

⚠️ IMPORTANT: Base your prediction ONLY on the data provided below.
Do NOT use any external knowledge about real-world players, teams, or leagues.
All team and player identifiers are fictional. Judge purely on the numbers given.

MATCH ${match.matchNumber} (${match.matchType})
${t1Name} (${t1Short}) vs ${t2Name} (${t2Short})

═══ VENUE ═══
${venueLine}
- Pace/Spin: ${traits.paceAdvantage > 0.3 ? "Strong pace advantage" : traits.paceAdvantage > 0 ? "Slight pace advantage" : traits.paceAdvantage < -0.3 ? "Strong spin advantage" : traits.paceAdvantage < 0 ? "Slight spin advantage" : "Balanced"}
- Batting conditions: ${traits.battingFriendly > 0.8 ? "Run-fest (200+ expected)" : traits.battingFriendly > 0.6 ? "Batting-friendly" : traits.battingFriendly < 0.4 ? "Bowler-dominant" : "Balanced"} | Avg 1st innings: ${traits.avgFirstInnings}
- Boundaries: ${traits.groundSize < 0.35 ? "Very small (favors big hitters)" : traits.groundSize < 0.5 ? "Small-medium" : traits.groundSize > 0.75 ? "Very large (favors placement)" : "Medium-large"}
- Dew: ${traits.dewFactor > 0.7 ? "Heavy (big chasing advantage)" : traits.dewFactor > 0.4 ? "Moderate" : "Minimal"}
${homeTeamLabel ? `🏟️ HOME ADVANTAGE: ${homeTeamLabel}` : "🏟️ NEUTRAL VENUE"}

${teamStrengthSection}

═══ CURRENT STANDINGS ═══
${pointsTable || "  Season not yet started"}

═══ HEAD-TO-HEAD (this season) ═══
${h2hMatches.length > 0 ? `  ${t1Short} ${h2hT1Wins} - ${h2hT2Wins} ${t2Short}` : "  No previous meetings this season"}${histH2hSection}

═══ RECENT FORM ═══
  ${t1Short}: ${getTeamForm(match.team1Index) || "No matches yet"}
  ${t2Short}: ${getTeamForm(match.team2Index) || "No matches yet"}

═══ ALL RESULTS SO FAR ═══
${pastMatches || "  Season opener — no results yet"}

ANALYSIS CHECKLIST:
1. Which team has stronger historical performance and win rate?
2. Does home advantage or venue conditions favor either team?
3. What does recent form and momentum suggest?
4. What does the head-to-head record indicate?
5. Are there any must-win scenarios from the standings?

RESPOND EXACTLY IN THIS FORMAT:
PREDICTION: [${t1Short} or ${t2Short}]
CONFIDENCE: [0.50 to 0.95]
MARGIN: [e.g. "5 wickets" or "22 runs" or "Super Over"]
FACTORS:
- [Key factor 1]
- [Key factor 2]
- [Key factor 3]
REASONING: [2-3 sentence analysis]`;
}

function parsePrediction(response: string, team1Index: number, team2Index: number, teams: TeamConfig[], isRealData: boolean): {
  predictedWinner: number;
  confidence: number;
  predictedMargin: string;
  keyFactors: string[];
  reasoning: string;
} {
  // Real data: LLM responds with real short names (CSK, MI). Synthetic: fictional aliases (FHK, STB).
  const t1Short = isRealData ? teams[team1Index].shortName : teams[team1Index].promptShort;
  const _t2Short = isRealData ? teams[team2Index].shortName : teams[team2Index].promptShort;

  // Parse prediction
  const predMatch = response.match(/PREDICTION:\s*(\w+)/i);
  const predTeam = predMatch?.[1]?.toUpperCase() || "";
  const predictedWinner = predTeam === t1Short.toUpperCase() ? team1Index : team2Index;

  // Parse confidence
  const confMatch = response.match(/CONFIDENCE:\s*([\d.]+)/i);
  let confidence = confMatch ? parseFloat(confMatch[1]) : 0.6;
  confidence = Math.max(0.5, Math.min(0.95, confidence));

  // Parse margin
  const marginMatch = response.match(/MARGIN:\s*(.+?)(?:\n|$)/i);
  const predictedMargin = marginMatch?.[1]?.trim() || "5 wickets";

  // Parse factors
  const factorsSection = response.match(/FACTORS:\s*\n([\s\S]*?)(?:REASONING:|$)/i);
  const keyFactors = factorsSection
    ? factorsSection[1].split("\n").filter((l) => l.trim().startsWith("-")).map((l) => l.replace(/^-\s*/, "").trim()).filter(Boolean)
    : ["General team strength advantage"];

  // Parse reasoning
  const reasoningMatch = response.match(/REASONING:\s*([\s\S]+?)$/i);
  const reasoning = reasoningMatch?.[1]?.trim() || "Based on overall team analysis.";

  return { predictedWinner, confidence, predictedMargin, keyFactors, reasoning };
}

async function callOpenRouter(model: string, prompt: string, isRealData: boolean): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const systemPrompt = isRealData
    ? "You are an expert IPL cricket analyst. You have deep knowledge of IPL teams, players, venues, and match dynamics. Use ALL your cricket knowledge — team histories, player strengths/weaknesses, venue records, captaincy, batting orders, bowling attacks, and match-up analysis. Combine your knowledge with the stats and context provided in the prompt. Be data-driven and precise — higher confidence only when multiple factors clearly align."
    : "You are an expert T20 cricket analyst predicting match outcomes for the Blitz Premier League. You have deep knowledge of how venue conditions (pace/spin, ground size, dew) interact with squad composition (pace vs spin bowlers, power hitters vs anchors). Analyze squad strengths against venue traits, current form, head-to-head records, and standings context. Be data-driven and precise — higher confidence only when multiple factors align. IMPORTANT: Use ONLY the data provided in the prompt. Do not reference any external knowledge about real-world cricket players, teams, or leagues. All identifiers are fictional.";

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

/** Wait for an external agent to submit a prediction via API */
async function waitForExternalPrediction(
  tournamentId: string,
  agentIndex: number,
  match: any,
  prompt: string,
  teams: TeamConfig[],
  isRealData: boolean
): Promise<{ predictedWinner: number; confidence: number; predictedMargin: string; keyFactors: string[]; reasoning: string }> {
  const TIMEOUT_MS = 120_000; // 2 minutes
  const POLL_MS = 2_000; // 2 seconds

  // Set pending prediction signal so external agent knows it's their turn
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  const config = JSON.parse(tournament?.config || "{}");
  config.pendingExternalPrediction = {
    agentIndex,
    matchId: match.id,
    matchNumber: match.matchNumber,
    prompt,
  };
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { config: JSON.stringify(config) },
  });

  console.log(`  [Waiting] External agent #${agentIndex} — match ${match.matchNumber}...`);

  const startTime = Date.now();
  while (Date.now() - startTime < TIMEOUT_MS) {
    const fresh = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    const freshConfig = JSON.parse(fresh?.config || "{}");
    const response = freshConfig.externalPredictionResponse;

    if (response && response.agentIndex === agentIndex) {
      // Clear the response and pending signal
      delete freshConfig.externalPredictionResponse;
      delete freshConfig.pendingExternalPrediction;
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: { config: JSON.stringify(freshConfig) },
      });

      // Parse the prediction team name to an index
      const t1Short = isRealData ? teams[match.team1Index].shortName : teams[match.team1Index].promptShort;
      const predTeam = String(response.prediction).toUpperCase();
      const predictedWinner = predTeam === t1Short.toUpperCase() ? match.team1Index : match.team2Index;

      return {
        predictedWinner,
        confidence: response.confidence,
        predictedMargin: response.margin,
        keyFactors: response.keyFactors,
        reasoning: response.reasoning,
      };
    }

    await new Promise((r) => setTimeout(r, POLL_MS));
  }

  // Timeout — clear pending and auto-predict randomly
  console.log(`  [Timeout] External agent #${agentIndex} timed out on match ${match.matchNumber}, using random prediction`);
  const cfg = JSON.parse((await prisma.tournament.findUnique({ where: { id: tournamentId } }))?.config || "{}");
  delete cfg.pendingExternalPrediction;
  await prisma.tournament.update({ where: { id: tournamentId }, data: { config: JSON.stringify(cfg) } });

  return {
    predictedWinner: Math.random() > 0.5 ? match.team1Index : match.team2Index,
    confidence: 0.55,
    predictedMargin: "5 wickets",
    keyFactors: ["External agent timed out — random prediction"],
    reasoning: "External agent did not respond within 120 seconds.",
  };
}

// Background prediction runner — called fire-and-forget from the API route
export async function runPredictionsAndEvaluate(
  tournamentId: string,
  customPredictors?: { name: string; model: string }[]
) {
  const predictors = customPredictors?.length ? customPredictors : DEFAULT_PREDICTORS;

  // Load squad data from tournament config
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  const tournamentConfig = JSON.parse(tournament?.config || "{}");

  // Save expected agent count in config so frontend can show correct progress
  tournamentConfig.expectedAgentCount = predictors.length;
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: "PREDICTING", config: JSON.stringify(tournamentConfig) },
  });

  const matches = await prisma.tournamentMatch.findMany({
    where: { tournamentId },
    orderBy: { matchNumber: "asc" },
  });
  const teamSquads: any[] = tournamentConfig.teamSquads || [];

  // Use TEAMS_FULL for real data tournaments, TEAMS for synthetic
  const isRealData = tournament?.dataSource === "real";
  const teamsConfig: TeamConfig[] = isRealData ? TEAMS_FULL : TEAMS;

  // For real data: load visible season history so agents have team stats
  const visibleHistory = isRealData && tournament?.evalSeason
    ? getVisibleHistory(tournament.evalSeason)
    : undefined;

  if (isRealData) {
    console.log(`[TourBench] Real data mode — ${visibleHistory?.length || 0} visible history matches loaded for ${tournament?.evalSeason}`);
  }

  for (let pIdx = 0; pIdx < predictors.length; pIdx++) {
    const predictor = predictors[pIdx];
    const isExternal = predictor.model === "external";
    console.log(`[TourBench] ${predictor.name}${isExternal ? " (EXTERNAL)" : ""} predicting ${matches.length} matches...`);

    for (const match of matches) {
      // Check if tournament was cancelled (stop button pressed)
      const freshStatus = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { status: true },
      });
      if (freshStatus?.status === "CANCELLED") {
        console.log(`[TourBench] Tournament ${tournamentId} was cancelled, stopping predictions.`);
        return;
      }

      try {
        const prompt = buildMatchPrompt(match, matches, teamSquads, teamsConfig, visibleHistory);
        let response: string;
        let parsed;

        if (isExternal) {
          // External agent — wait for prediction via API
          parsed = await waitForExternalPrediction(tournamentId, pIdx, match, prompt, teamsConfig, isRealData);
        } else {
          response = await callOpenRouter(predictor.model, prompt, isRealData);
          parsed = parsePrediction(response, match.team1Index, match.team2Index, teamsConfig, isRealData);
        }

        await prisma.tournamentPrediction.create({
          data: {
            matchId: match.id,
            agentId: predictor.name,
            agentName: predictor.name,
            predictedWinner: parsed.predictedWinner,
            confidence: parsed.confidence,
            predictedMargin: parsed.predictedMargin,
            keyFactors: JSON.stringify(parsed.keyFactors),
            reasoning: parsed.reasoning,
          },
        });

        emitTournamentUpdate(tournamentId, {
          type: "prediction",
          agentName: predictor.name,
          matchNumber: match.matchNumber,
          predictedWinner: parsed.predictedWinner,
          confidence: parsed.confidence,
        });
      } catch (err) {
        console.error(`[TourBench] ${predictor.name} failed on match ${match.matchNumber}:`, err);

        await prisma.tournamentPrediction.create({
          data: {
            matchId: match.id,
            agentId: predictor.name,
            agentName: predictor.name,
            predictedWinner: Math.random() < 0.5 ? match.team1Index : match.team2Index,
            confidence: 0.55,
            predictedMargin: "Unknown",
            keyFactors: JSON.stringify(["Prediction failed, defaulted"]),
            reasoning: "API call failed, random prediction used.",
          },
        });

        emitTournamentUpdate(tournamentId, {
          type: "prediction",
          agentName: predictor.name,
          matchNumber: match.matchNumber,
          predictedWinner: null,
          confidence: 0.55,
          error: true,
        });
      }
    }
  }

  const _evalResults = await runTourEvaluation(tournamentId);

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  emitTournamentUpdate(tournamentId, { type: "tournament_complete" });

  console.log(`[TourBench] Tournament ${tournamentId} complete!`);
}

// Full synchronous run (kept for direct use)
export async function runFullTournament(
  auctionId?: string,
  customPredictors?: { name: string; model: string }[]
): Promise<{
  tournamentId: string;
  champion: string;
  agentResults: { name: string; accuracy: number; brierScore: number }[];
}> {
  const tournamentId = await createTournament(auctionId);
  await runPredictionsAndEvaluate(tournamentId, customPredictors);

  const matches = await prisma.tournamentMatch.findMany({
    where: { tournamentId },
    orderBy: { matchNumber: "asc" },
  });

  const finalMatch = matches.find((m) => m.matchType === "FINAL");
  const champion = finalMatch?.actualWinner !== null && finalMatch?.actualWinner !== undefined
    ? TEAMS[finalMatch.actualWinner].name
    : "Unknown";

  const evalRecord = await prisma.tournamentEvaluation.findUnique({
    where: { tournamentId },
  });
  const evalResults = evalRecord ? JSON.parse(evalRecord.results || "{}") : { agentScores: [] };

  return {
    tournamentId,
    champion,
    agentResults: evalResults.agentScores.map((a: any) => ({
      name: a.agentName,
      accuracy: a.accuracy,
      brierScore: a.brierScore,
    })),
  };
}
