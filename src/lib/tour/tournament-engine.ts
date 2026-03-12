import { prisma } from "@/lib/db";
import { VENUES, getVenueForMatch, getVenueAdvantage } from "./venue-system";
import { TEAMS } from "@/data/team-config";
import { TEAMS_FULL } from "@/data/team-config-full";
import { SEASON_MATCHES, SEASON_CONFIG, type SeasonId } from "@/data/ipl-seasons";

interface TeamSquadData {
  teamIndex: number;
  players: {
    name: string;
    role: string;
    subType: string;
    nationality: string;
    impactScore: number;
    battingAvg: number;
    strikeRate: number;
    bowlingAvg: number;
    economy: number;
  }[];
  totalStrength: number;
}

// Generate match schedule for given team indices
function generateSchedule(teamIndices: number[]): { team1: number; team2: number; matchType: string }[] {
  const matches: { team1: number; team2: number; matchType: string }[] = [];

  // League stage: each team plays every other twice (home + away)
  const pairs: [number, number][] = [];
  for (let i = 0; i < teamIndices.length; i++) {
    for (let j = i + 1; j < teamIndices.length; j++) {
      pairs.push([teamIndices[i], teamIndices[j]]);
    }
  }
  // First leg
  for (const [a, b] of pairs) {
    matches.push({ team1: a, team2: b, matchType: "LEAGUE" });
  }
  // Second leg (reversed home/away)
  for (const [a, b] of pairs) {
    matches.push({ team1: b, team2: a, matchType: "LEAGUE" });
  }

  // Playoffs: filled after league simulation (placeholders)
  if (teamIndices.length >= 3) {
    matches.push({ team1: -1, team2: -1, matchType: "QUALIFIER" });
  }
  matches.push({ team1: -1, team2: -1, matchType: "FINAL" });

  return matches;
}

// Generate synthetic team squads (standalone mode)
function generateSyntheticSquads(teamCount: number): TeamSquadData[] {
  const roles = ["BATSMAN", "BOWLER", "ALL_ROUNDER", "WICKET_KEEPER"];
  const subTypes: Record<string, string[]> = {
    BATSMAN: ["powerplay_hitter", "anchor", "finisher"],
    BOWLER: ["pace_ace", "death_bowler", "spin_wizard"],
    ALL_ROUNDER: ["batting_allrounder", "bowling_allrounder"],
    WICKET_KEEPER: ["keeper_batsman"],
  };

  return Array.from({ length: teamCount }, (_, teamIndex) => {
    const players = [];
    // 5 batsmen, 5 bowlers, 3 allrounders, 2 keepers = 15
    const composition = [
      { role: "BATSMAN", count: 5 },
      { role: "BOWLER", count: 5 },
      { role: "ALL_ROUNDER", count: 3 },
      { role: "WICKET_KEEPER", count: 2 },
    ];

    for (const { role, count } of composition) {
      for (let i = 0; i < count; i++) {
        const subs = subTypes[role];
        const sub = subs[Math.floor(Math.random() * subs.length)];
        const isOverseas = Math.random() < 0.3;
        const talent = 40 + Math.random() * 50; // 40-90 base talent

        players.push({
          name: `Player_${teamIndex}_${role}_${i}`,
          role,
          subType: sub,
          nationality: isOverseas ? "Overseas" : "India",
          impactScore: talent + (Math.random() - 0.5) * 20,
          battingAvg: role === "BOWLER" ? 12 + Math.random() * 10 : 25 + Math.random() * 20,
          strikeRate: role === "BOWLER" ? 100 + Math.random() * 30 : 120 + Math.random() * 40,
          bowlingAvg: role === "BATSMAN" ? 0 : 20 + Math.random() * 15,
          economy: role === "BATSMAN" ? 0 : 6 + Math.random() * 4,
        });
      }
    }

    const totalStrength = players.reduce((sum, p) => sum + p.impactScore, 0) / players.length;
    return { teamIndex, players, totalStrength };
  });
}

// Load squads from a completed auction
async function loadSquadsFromAuction(auctionId: string): Promise<TeamSquadData[]> {
  const teams = await prisma.auctionTeam.findMany({
    where: { auctionId },
    include: {
      wonPlayers: true,
    },
  });

  return teams.map((team) => {
    const players = team.wonPlayers.map((p) => {
      const stats = JSON.parse(p.careerStats || "{}");
      const hidden = JSON.parse(p.hiddenSeasonPerf || "{}");
      return {
        name: p.name,
        role: p.role,
        subType: p.subType,
        nationality: p.nationality,
        impactScore: hidden.impactScore || 50,
        battingAvg: stats.batting_avg || stats.battingAvg || 0,
        strikeRate: stats.strike_rate || stats.strikeRate || 0,
        bowlingAvg: stats.bowling_avg || stats.bowlingAvg || 0,
        economy: stats.economy || 0,
      };
    });

    const totalStrength = players.length > 0
      ? players.reduce((sum, p) => sum + p.impactScore, 0) / players.length
      : 50;

    return { teamIndex: team.teamIndex, players, totalStrength };
  });
}

// Simulate a single match outcome — DETERMINISTIC
// Higher adjusted strength always wins. No randomness.
function simulateMatch(
  team1: TeamSquadData,
  team2: TeamSquadData,
  venueTraits: any,
  homeTeamIndex: number | null
): { winner: number; margin: string; t1Adjusted: number; t2Adjusted: number } {
  let t1Str = team1.totalStrength;
  let t2Str = team2.totalStrength;

  // Venue modifiers
  const paceAdv = venueTraits.paceAdvantage || 0;
  const spinAdv = -(venueTraits.paceAdvantage || 0);
  const battingFriendly = venueTraits.battingFriendly || 0.5;

  // Pace/spin bowler venue advantage
  const t1PaceBowlers = team1.players.filter((p) => p.role === "BOWLER" && ["pace_ace", "death_bowler"].includes(p.subType)).length;
  const t2PaceBowlers = team2.players.filter((p) => p.role === "BOWLER" && ["pace_ace", "death_bowler"].includes(p.subType)).length;
  const t1SpinBowlers = team1.players.filter((p) => p.role === "BOWLER" && p.subType === "spin_wizard").length;
  const t2SpinBowlers = team2.players.filter((p) => p.role === "BOWLER" && p.subType === "spin_wizard").length;

  t1Str += paceAdv * t1PaceBowlers * 2;
  t2Str += paceAdv * t2PaceBowlers * 2;
  t1Str += spinAdv * t1SpinBowlers * 2;
  t2Str += spinAdv * t2SpinBowlers * 2;

  // Batting-friendly venue boosts teams with strong batsmen
  const t1BatStrength = team1.players.filter((p) => p.role === "BATSMAN").reduce((s, p) => s + p.impactScore, 0) / Math.max(1, team1.players.filter((p) => p.role === "BATSMAN").length);
  const t2BatStrength = team2.players.filter((p) => p.role === "BATSMAN").reduce((s, p) => s + p.impactScore, 0) / Math.max(1, team2.players.filter((p) => p.role === "BATSMAN").length);

  if (battingFriendly > 0.7) {
    t1Str += (t1BatStrength - 50) * 0.1;
    t2Str += (t2BatStrength - 50) * 0.1;
  }

  // Home advantage
  if (homeTeamIndex === team1.teamIndex) t1Str *= 1.05;
  if (homeTeamIndex === team2.teamIndex) t2Str *= 1.05;

  // DETERMINISTIC: higher strength wins, always
  const diff = Math.abs(t1Str - t2Str);
  const winner = t1Str >= t2Str ? team1.teamIndex : team2.teamIndex;

  // Margin derived from strength differential
  let margin: string;
  if (diff > 15) {
    margin = `${Math.min(9, Math.round(diff / 3))} wickets`;
  } else if (diff > 3) {
    margin = `${Math.round(diff * 2)} runs`;
  } else if (diff > 0) {
    margin = `${Math.max(1, Math.round(diff))} wickets`;
  } else {
    // Exact tie: team1 wins by tiebreaker (fewer overseas)
    margin = "Super Over";
  }

  return { winner, margin, t1Adjusted: t1Str, t2Adjusted: t2Str };
}

// Main entry: create and simulate a full tournament
export async function createTournament(auctionId?: string, teamCount: number = 4): Promise<string> {
  // Load or generate squads
  const squads = auctionId
    ? await loadSquadsFromAuction(auctionId)
    : generateSyntheticSquads(teamCount);

  // Ensure we have at least 2 teams
  if (squads.length < 2) {
    throw new Error("Need at least 2 teams for a tournament");
  }

  const schedule = generateSchedule(squads.map((s) => s.teamIndex));

  // Create tournament
  const tournament = await prisma.tournament.create({
    data: {
      auctionId: auctionId || null,
      status: "PENDING",
      config: JSON.stringify({
        teamSquads: squads.map((s) => ({
          teamIndex: s.teamIndex,
          teamName: TEAMS[s.teamIndex].name,
          shortName: TEAMS[s.teamIndex].shortName,
          playerCount: s.players.length,
          totalStrength: s.totalStrength,
          roleCounts: {
            batsmen: s.players.filter((p) => p.role === "BATSMAN").length,
            bowlers: s.players.filter((p) => p.role === "BOWLER").length,
            allRounders: s.players.filter((p) => p.role === "ALL_ROUNDER").length,
            keepers: s.players.filter((p) => p.role === "WICKET_KEEPER").length,
          },
          overseasCount: s.players.filter((p) => p.nationality !== "India").length,
          avgBattingAvg: +(s.players.filter((p) => p.battingAvg > 0).reduce((a, p) => a + p.battingAvg, 0) / Math.max(1, s.players.filter((p) => p.battingAvg > 0).length)).toFixed(1),
          avgStrikeRate: +(s.players.filter((p) => p.strikeRate > 0).reduce((a, p) => a + p.strikeRate, 0) / Math.max(1, s.players.filter((p) => p.strikeRate > 0).length)).toFixed(1),
          avgEconomy: +(s.players.filter((p) => p.economy > 0).reduce((a, p) => a + p.economy, 0) / Math.max(1, s.players.filter((p) => p.economy > 0).length)).toFixed(2),
          paceCount: s.players.filter((p) => ["pace_ace", "death_bowler"].includes(p.subType)).length,
          spinCount: s.players.filter((p) => p.subType === "spin_wizard").length,
          powerHitters: s.players.filter((p) => p.subType === "powerplay_hitter" || p.subType === "finisher").length,
          topPlayers: s.players
            .sort((a, b) => b.impactScore - a.impactScore)
            .slice(0, 5)
            .map((p) => ({ name: p.name, role: p.role, subType: p.subType })),
        })),
      }),
    },
  });

  // Create league matches (first 12)
  const leagueMatches = schedule.filter((m) => m.matchType === "LEAGUE");
  const leagueResults: { teamIndex: number; wins: number; losses: number; nrr: number }[] =
    Array.from({ length: squads.length }, (_, i) => ({ teamIndex: squads[i].teamIndex, wins: 0, losses: 0, nrr: 0 }));

  for (let i = 0; i < leagueMatches.length; i++) {
    const m = leagueMatches[i];
    const venue = getVenueForMatch(m.team1, m.team2, i + 1);
    const result = simulateMatch(
      squads.find((s) => s.teamIndex === m.team1)!,
      squads.find((s) => s.teamIndex === m.team2)!,
      venue.traits,
      venue.homeTeamIndex
    );

    await prisma.tournamentMatch.create({
      data: {
        tournamentId: tournament.id,
        matchNumber: i + 1,
        matchType: "LEAGUE",
        team1Index: m.team1,
        team2Index: m.team2,
        venue: venue.name,
        venueTraits: JSON.stringify(venue.traits),
        homeTeamIndex: venue.homeTeamIndex,
        actualWinner: result.winner,
        actualMargin: result.margin,
        team1Strength: result.t1Adjusted,
        team2Strength: result.t2Adjusted,
      },
    });

    // Update standings
    const winnerStanding = leagueResults.find((r) => r.teamIndex === result.winner)!;
    const loserIdx = result.winner === m.team1 ? m.team2 : m.team1;
    const loserStanding = leagueResults.find((r) => r.teamIndex === loserIdx)!;
    winnerStanding.wins++;
    loserStanding.losses++;
    winnerStanding.nrr += (Math.random() * 0.5 + 0.1);
    loserStanding.nrr -= (Math.random() * 0.5 + 0.1);
  }

  // Sort standings: points (wins*2), then NRR
  leagueResults.sort((a, b) => (b.wins * 2 - a.wins * 2) || (b.nrr - a.nrr));

  // Playoffs — adapt to team count
  const playoffMatchNum = leagueMatches.length + 1;
  const neutralVenue = VENUES.find((v) => v.homeTeamIndex === null) || VENUES[0];

  if (squads.length >= 3) {
    // Qualifier: 1st vs 2nd
    const q1 = leagueResults[0].teamIndex;
    const q2 = leagueResults[1].teamIndex;
    const qualifierResult = simulateMatch(
      squads.find((s) => s.teamIndex === q1)!,
      squads.find((s) => s.teamIndex === q2)!,
      neutralVenue.traits,
      null
    );

    await prisma.tournamentMatch.create({
      data: {
        tournamentId: tournament.id,
        matchNumber: playoffMatchNum,
        matchType: "QUALIFIER",
        team1Index: q1,
        team2Index: q2,
        venue: neutralVenue.name,
        venueTraits: JSON.stringify(neutralVenue.traits),
        homeTeamIndex: null,
        actualWinner: qualifierResult.winner,
        actualMargin: qualifierResult.margin,
        team1Strength: qualifierResult.t1Adjusted,
        team2Strength: qualifierResult.t2Adjusted,
      },
    });

    // Final: qualifier winner vs 3rd place team
    const finalTeam1 = qualifierResult.winner;
    const finalTeam2 = leagueResults[2].teamIndex;
    const finalVenue = VENUES[4] || neutralVenue;
    const finalResult = simulateMatch(
      squads.find((s) => s.teamIndex === finalTeam1)!,
      squads.find((s) => s.teamIndex === finalTeam2)!,
      finalVenue.traits,
      null
    );

    await prisma.tournamentMatch.create({
      data: {
        tournamentId: tournament.id,
        matchNumber: playoffMatchNum + 1,
        matchType: "FINAL",
        team1Index: finalTeam1,
        team2Index: finalTeam2,
        venue: finalVenue.name,
        venueTraits: JSON.stringify(finalVenue.traits),
        homeTeamIndex: null,
        actualWinner: finalResult.winner,
        actualMargin: finalResult.margin,
        team1Strength: finalResult.t1Adjusted,
        team2Strength: finalResult.t2Adjusted,
      },
    });
  } else {
    // 2 teams: league winner IS the champion — just add a final (1st vs 2nd)
    const f1 = leagueResults[0].teamIndex;
    const f2 = leagueResults[1].teamIndex;
    const finalResult = simulateMatch(
      squads.find((s) => s.teamIndex === f1)!,
      squads.find((s) => s.teamIndex === f2)!,
      neutralVenue.traits,
      null
    );

    await prisma.tournamentMatch.create({
      data: {
        tournamentId: tournament.id,
        matchNumber: playoffMatchNum,
        matchType: "FINAL",
        team1Index: f1,
        team2Index: f2,
        venue: neutralVenue.name,
        venueTraits: JSON.stringify(neutralVenue.traits),
        homeTeamIndex: null,
        actualWinner: finalResult.winner,
        actualMargin: finalResult.margin,
        team1Strength: finalResult.t1Adjusted,
        team2Strength: finalResult.t2Adjusted,
      },
    });
  }

  await prisma.tournament.update({
    where: { id: tournament.id },
    data: { status: "PREDICTING" },
  });

  return tournament.id;
}

// ─── Real Data Tournament (IPL S1-S4) ─────────────────────

const TEAM_NAME_MAP: Record<string, number> = {};
for (const t of TEAMS_FULL) {
  TEAM_NAME_MAP[t.name.toLowerCase()] = t.index;
  TEAM_NAME_MAP[t.shortName.toLowerCase()] = t.index;
}
// Handle alternate spellings
TEAM_NAME_MAP["royal challengers bangalore"] = 2;
TEAM_NAME_MAP["delhi daredevils"] = 6;
TEAM_NAME_MAP["kings xi punjab"] = 7;
TEAM_NAME_MAP["rising pune supergiant"] = -1;
TEAM_NAME_MAP["rising pune supergiants"] = -1;
TEAM_NAME_MAP["pune warriors"] = -1;
TEAM_NAME_MAP["kochi tuskers kerala"] = -1;
TEAM_NAME_MAP["deccan chargers"] = -1;

export function resolveTeamIndex(name: string): number {
  return TEAM_NAME_MAP[name.toLowerCase()] ?? -1;
}

function venueTraitsFromName(venueName: string): any {
  const v = venueName.toLowerCase();
  const known = VENUES.find((venue) =>
    v.includes(venue.name.toLowerCase().split(" ")[0]) ||
    v.includes(venue.city.toLowerCase())
  );
  if (known) return known.traits;
  // Default balanced venue
  return {
    paceAdvantage: 0,
    battingFriendly: 0.5,
    groundSize: 0.5,
    dewFactor: 0.4,
    spinLater: 0.3,
    avgFirstInnings: 165,
    description: "Unknown venue — balanced conditions assumed",
  };
}

function homeTeamFromVenue(venueName: string): number | null {
  const v = venueName.toLowerCase();
  const known = VENUES.find((venue) =>
    v.includes(venue.name.toLowerCase().split(" ")[0]) ||
    v.includes(venue.city.toLowerCase())
  );
  return known?.homeTeamIndex ?? null;
}

export async function createRealDataTournament(seasonId: SeasonId): Promise<string> {
  const matches = SEASON_MATCHES[seasonId];
  if (!matches || matches.length === 0) {
    throw new Error(`No match data for season ${seasonId}`);
  }

  const seasonConfig = SEASON_CONFIG[seasonId];

  // Collect unique teams in this season
  const teamIndicesSet = new Set<number>();
  for (const m of matches) {
    const t1 = resolveTeamIndex(m.team1);
    const t2 = resolveTeamIndex(m.team2);
    if (t1 >= 0) teamIndicesSet.add(t1);
    if (t2 >= 0) teamIndicesSet.add(t2);
  }
  const teamIndices = Array.from(teamIndicesSet).sort((a, b) => a - b);

  const tournament = await prisma.tournament.create({
    data: {
      status: "PENDING",
      dataSource: "real",
      evalSeason: seasonId,
      config: JSON.stringify({
        seasonLabel: seasonConfig.label,
        evalYear: seasonConfig.eval,
        visibleYears: seasonConfig.visible,
        teamCount: teamIndices.length,
        matchCount: matches.length,
        teamSquads: teamIndices.map((idx) => ({
          teamIndex: idx,
          teamName: TEAMS_FULL[idx].name,
          shortName: TEAMS_FULL[idx].shortName,
          playerCount: 0,
          totalStrength: 50,
          roleCounts: { batsmen: 0, bowlers: 0, allRounders: 0, keepers: 0 },
          overseasCount: 0,
          avgBattingAvg: 0,
          avgStrikeRate: 0,
          avgEconomy: 0,
          paceCount: 0,
          spinCount: 0,
          powerHitters: 0,
          topPlayers: [],
        })),
      }),
    },
  });

  // Create match records with real results
  for (const m of matches) {
    const t1Idx = resolveTeamIndex(m.team1);
    const t2Idx = resolveTeamIndex(m.team2);
    const winnerIdx = resolveTeamIndex(m.winner);

    if (t1Idx < 0 || t2Idx < 0 || winnerIdx < 0) continue;

    const traits = venueTraitsFromName(m.venue);
    const home = homeTeamFromVenue(m.venue);

    await prisma.tournamentMatch.create({
      data: {
        tournamentId: tournament.id,
        matchNumber: m.matchNumber,
        matchType: "LEAGUE",
        team1Index: t1Idx,
        team2Index: t2Idx,
        venue: m.venue,
        venueTraits: JSON.stringify(traits),
        homeTeamIndex: home,
        actualWinner: winnerIdx,
        actualMargin: m.margin,
        team1Strength: 0,
        team2Strength: 0,
      },
    });
  }

  await prisma.tournament.update({
    where: { id: tournament.id },
    data: { status: "PREDICTING" },
  });

  return tournament.id;
}
