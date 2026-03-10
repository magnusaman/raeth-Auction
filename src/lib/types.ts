// ─── Core Types ──────────────────────────────────────────────

export type PlayerRole = "BATSMAN" | "BOWLER" | "ALL_ROUNDER" | "WICKET_KEEPER";

export type PlayerSubType =
  | "powerplay_hitter"
  | "anchor"
  | "finisher"
  | "accumulator"
  | "powerplay_bowler"
  | "death_bowler"
  | "spin_wizard"
  | "pace_ace"
  | "medium_pace"
  | "batting_allrounder"
  | "bowling_allrounder"
  | "keeper_batsman"
  | "keeper_specialist";

export interface CareerStats {
  matches: number;
  innings: number;
  // Batting
  runs?: number;
  battingAvg?: number;
  strikeRate?: number;
  fifties?: number;
  hundreds?: number;
  boundaryPct?: number;
  dotPct?: number;
  // Bowling
  wickets?: number;
  bowlingAvg?: number;
  economy?: number;
  bowlingStrikeRate?: number;
  dotBallPct?: number;
  // Fielding
  catches?: number;
  stumpings?: number;
}

export interface SeasonRecord {
  season: number; // 1, 2, 3 (most recent)
  matches: number;
  runs?: number;
  wickets?: number;
  avg?: number;
  sr?: number;
  economy?: number;
  rating: number; // 1-10 overall performance
}

export interface HiddenSeasonPerf {
  projectedRuns?: number;
  projectedWickets?: number;
  projectedAvg?: number;
  projectedSR?: number;
  projectedEconomy?: number;
  matchesPlayed: number;
  overallRating: number; // 1-10
  impactScore: number; // 0-100
}

export interface SyntheticPlayer {
  name: string;
  anonId?: string; // e.g. "PLAYER_047" — sent to LLMs instead of real name
  nationality: string;
  age: number;
  role: PlayerRole;
  subType: PlayerSubType;
  basePrice: number; // in Crores
  careerStats: CareerStats;
  recentForm: SeasonRecord[];
  styleTags: string[];
  hiddenTrueValue: number; // in Crores — what they're actually worth
  hiddenSeasonPerf: HiddenSeasonPerf;
  isTrap: boolean;
  isSleeper: boolean;
}

// ─── Team Config ─────────────────────────────────────────────

export interface TeamConfig {
  index: number;
  name: string;
  shortName: string;
  color: string;
  logo: string; // emoji or SVG path
  promptAlias: string;  // fictional name sent to LLMs (anti-leakage)
  promptShort: string;  // fictional short name sent to LLMs
}

// ─── Auction Config ──────────────────────────────────────────

export interface AuctionConfig {
  pursePerTeam: number; // 100 Cr
  minSquadSize: number; // 15
  maxSquadSize: number; // 20
  maxOverseas: number;  // 8
  minBatsmen: number;   // 5
  minBowlers: number;   // 5
  minAllRounders: number; // 3
  minKeepers: number;   // 2
  bidTimerSeconds: number; // 30
  maxPlayerPrice: number; // 25 — hard cap per player to prevent runaway bidding wars
  bidIncrements: BidIncrement[];
}

export interface BidIncrement {
  upTo: number;    // bid amount threshold
  increment: number;
}

export const DEFAULT_AUCTION_CONFIG: AuctionConfig = {
  pursePerTeam: 100,
  minSquadSize: 15,
  maxSquadSize: 20,
  maxOverseas: 8,
  minBatsmen: 5,
  minBowlers: 5,
  minAllRounders: 3,
  minKeepers: 2,
  bidTimerSeconds: 30,
  maxPlayerPrice: 25, // ₹25 Cr hard cap — prevents runaway bidding wars (IPL record ~₹27 Cr)
  bidIncrements: [
    { upTo: 2, increment: 0.20 },   // Below ₹2 Cr: +20 Lakhs
    { upTo: 5, increment: 0.25 },   // ₹2-5 Cr: +25 Lakhs
    { upTo: 10, increment: 0.50 },  // ₹5-10 Cr: +50 Lakhs
    { upTo: Infinity, increment: 1.00 }, // ₹10+ Cr: +1 Crore
  ],
};

// ─── Auction State (sent to agents) ─────────────────────────

export interface AuctionStateForAgent {
  phase: "LOBBY" | "BIDDING" | "SOLD" | "UNSOLD" | "BETWEEN_LOTS" | "COMPLETE";
  currentLot: CurrentLotInfo | null;
  currentBid: { amount: number; teamId: string } | null;
  yourTeam: YourTeamInfo;
  otherTeams: OtherTeamInfo[];
  auctionProgress: { lotsCompleted: number; lotsRemaining: number };
  timerSecondsRemaining: number;
}

export interface CurrentLotInfo {
  playerId: string;
  lotNumber: number;
  name: string;
  anonId?: string; // anonymized ID for LLM prompts
  role: PlayerRole;
  subType: PlayerSubType;
  nationality: string;
  age: number;
  basePrice: number;
  careerStats: CareerStats;
  recentForm: SeasonRecord[];
  styleTags: string[];
}

export interface YourTeamInfo {
  teamId: string;
  teamIndex: number;
  purseRemaining: number;
  squad: SquadMember[];
  squadSize: number;
  overseasCount: number;
  roleCounts: Record<PlayerRole, number>;
  needs: {
    batsmenNeeded: number;
    bowlersNeeded: number;
    allRoundersNeeded: number;
    keepersNeeded: number;
    totalSlotsRemaining: number;
  };
}

export interface SquadMember {
  playerId: string;
  name: string;
  role: PlayerRole;
  nationality: string;
  pricePaid: number;
}

export interface OtherTeamInfo {
  teamId: string;
  teamIndex: number;
  purseRemaining: number;
  squadSize: number;
  overseasCount: number;
}

// ─── Bid Action ──────────────────────────────────────────────

export interface BidAction {
  action: "bid" | "pass";
  amount?: number;
  reasoning?: string;
}

// ─── Grading ─────────────────────────────────────────────────

export interface GraderResult {
  graderName: string;
  score: number; // 0-1 (or negative for penalties)
  details: string;
  breakdown?: Record<string, number>;
}

export interface TeamEvaluation {
  teamId: string;
  teamIndex: number;
  agentName: string;
  codeGraderScores: GraderResult[];
  modelGraderScores: GraderResult[];
  compositeScore: number;
  rank: number;
  highlights: {
    bestDecision: { lotNumber: number; description: string };
    worstDecision: { lotNumber: number; description: string };
  };
}

export interface EvaluationResults {
  auctionId: string;
  teamEvaluations: TeamEvaluation[];
  winner: { teamId: string; teamIndex: number; agentName: string; score: number };
  seasonSimulation: SeasonSimResult;
}

export interface SeasonSimResult {
  standings: {
    teamIndex: number;
    played: number;
    won: number;
    lost: number;
    nrr: number;
    points: number;
  }[];
  matchResults: {
    team1Index: number;
    team2Index: number;
    winnerIndex: number;
    margin: string;
  }[];
}
