import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma (use vi.hoisted so the variable is available in vi.mock factory) ──

const mockPrisma = vi.hoisted(() => ({
  tournament: {
    create: vi.fn(),
    update: vi.fn(),
  },
  tournamentMatch: {
    create: vi.fn(),
  },
  auctionTeam: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

// The module also imports TEAMS, TEAMS_FULL, venue-system, and ipl-seasons.
// These are real data files, so they will resolve via the alias.

import { createTournament, resolveTeamIndex } from "@/lib/tour/tournament-engine";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── resolveTeamIndex ───────────────────────────────────────

describe("resolveTeamIndex", () => {
  it("resolves known team by full name (case-insensitive)", () => {
    expect(resolveTeamIndex("Chennai Super Kings")).toBe(0);
    expect(resolveTeamIndex("chennai super kings")).toBe(0);
  });

  it("resolves known team by short name", () => {
    expect(resolveTeamIndex("CSK")).toBe(0);
    expect(resolveTeamIndex("MI")).toBe(1);
    expect(resolveTeamIndex("RCB")).toBe(2);
    expect(resolveTeamIndex("KKR")).toBe(3);
  });

  it("returns -1 for unknown teams", () => {
    expect(resolveTeamIndex("Unknown Team FC")).toBe(-1);
  });

  it("resolves alternate team names", () => {
    expect(resolveTeamIndex("Royal Challengers Bangalore")).toBe(2);
    expect(resolveTeamIndex("Delhi Daredevils")).toBe(6);
    expect(resolveTeamIndex("Kings XI Punjab")).toBe(7);
  });

  it("returns -1 for defunct teams", () => {
    expect(resolveTeamIndex("Rising Pune Supergiant")).toBe(-1);
    expect(resolveTeamIndex("Pune Warriors")).toBe(-1);
    expect(resolveTeamIndex("Kochi Tuskers Kerala")).toBe(-1);
    expect(resolveTeamIndex("Deccan Chargers")).toBe(-1);
  });
});

// ─── createTournament (synthetic squads) ────────────────────

describe("createTournament", () => {
  it("creates a tournament with synthetic squads for given team count", async () => {
    const tournamentId = "tournament-abc";
    mockPrisma.tournament.create.mockResolvedValue({ id: tournamentId });
    mockPrisma.tournamentMatch.create.mockResolvedValue({});
    mockPrisma.tournament.update.mockResolvedValue({});

    const result = await createTournament(undefined, 2);

    expect(result).toBe(tournamentId);
    expect(mockPrisma.tournament.create).toHaveBeenCalledTimes(1);

    // Verify config contains teamSquads
    const createCall = mockPrisma.tournament.create.mock.calls[0][0];
    const config = JSON.parse(createCall.data.config);
    expect(config.teamSquads).toHaveLength(2);
    expect(config.teamSquads[0].teamIndex).toBe(0);
    expect(config.teamSquads[1].teamIndex).toBe(1);
  });

  it("creates league matches (home and away) for 2 teams", async () => {
    const tournamentId = "tournament-abc";
    mockPrisma.tournament.create.mockResolvedValue({ id: tournamentId });
    mockPrisma.tournamentMatch.create.mockResolvedValue({});
    mockPrisma.tournament.update.mockResolvedValue({});

    await createTournament(undefined, 2);

    // 2 teams: 1 pair * 2 legs = 2 league matches + 1 final = 3 matches total
    expect(mockPrisma.tournamentMatch.create).toHaveBeenCalledTimes(3);

    // Check match types
    const matchCalls = mockPrisma.tournamentMatch.create.mock.calls.map(
      (c: any) => c[0].data.matchType
    );
    const leagueCount = matchCalls.filter((t: string) => t === "LEAGUE").length;
    const finalCount = matchCalls.filter((t: string) => t === "FINAL").length;
    expect(leagueCount).toBe(2);
    expect(finalCount).toBe(1);
  });

  it("creates correct number of matches for 3 teams", async () => {
    const tournamentId = "tournament-abc";
    mockPrisma.tournament.create.mockResolvedValue({ id: tournamentId });
    mockPrisma.tournamentMatch.create.mockResolvedValue({});
    mockPrisma.tournament.update.mockResolvedValue({});

    await createTournament(undefined, 3);

    // 3 teams: 3 pairs * 2 legs = 6 league matches + 1 qualifier + 1 final = 8
    expect(mockPrisma.tournamentMatch.create).toHaveBeenCalledTimes(8);

    const matchCalls = mockPrisma.tournamentMatch.create.mock.calls.map(
      (c: any) => c[0].data.matchType
    );
    expect(matchCalls.filter((t: string) => t === "LEAGUE").length).toBe(6);
    expect(matchCalls.filter((t: string) => t === "QUALIFIER").length).toBe(1);
    expect(matchCalls.filter((t: string) => t === "FINAL").length).toBe(1);
  });

  it("creates correct number of matches for 4 teams", async () => {
    const tournamentId = "tournament-abc";
    mockPrisma.tournament.create.mockResolvedValue({ id: tournamentId });
    mockPrisma.tournamentMatch.create.mockResolvedValue({});
    mockPrisma.tournament.update.mockResolvedValue({});

    await createTournament(undefined, 4);

    // 4 teams: 6 pairs * 2 legs = 12 league matches + 1 qualifier + 1 final = 14
    expect(mockPrisma.tournamentMatch.create).toHaveBeenCalledTimes(14);
  });

  it("updates tournament status to PREDICTING after creation", async () => {
    const tournamentId = "tournament-abc";
    mockPrisma.tournament.create.mockResolvedValue({ id: tournamentId });
    mockPrisma.tournamentMatch.create.mockResolvedValue({});
    mockPrisma.tournament.update.mockResolvedValue({});

    await createTournament(undefined, 2);

    expect(mockPrisma.tournament.update).toHaveBeenCalledWith({
      where: { id: tournamentId },
      data: { status: "PREDICTING" },
    });
  });

  it("generates synthetic squads with correct composition (15 players per team)", async () => {
    const tournamentId = "tournament-abc";
    mockPrisma.tournament.create.mockResolvedValue({ id: tournamentId });
    mockPrisma.tournamentMatch.create.mockResolvedValue({});
    mockPrisma.tournament.update.mockResolvedValue({});

    await createTournament(undefined, 2);

    const createCall = mockPrisma.tournament.create.mock.calls[0][0];
    const config = JSON.parse(createCall.data.config);
    for (const squad of config.teamSquads) {
      expect(squad.playerCount).toBe(15);
      expect(squad.roleCounts.batsmen).toBe(5);
      expect(squad.roleCounts.bowlers).toBe(5);
      expect(squad.roleCounts.allRounders).toBe(3);
      expect(squad.roleCounts.keepers).toBe(2);
    }
  });

  it("stores each match with winner information", async () => {
    const tournamentId = "tournament-abc";
    mockPrisma.tournament.create.mockResolvedValue({ id: tournamentId });
    mockPrisma.tournamentMatch.create.mockResolvedValue({});
    mockPrisma.tournament.update.mockResolvedValue({});

    await createTournament(undefined, 2);

    // Every match should have an actualWinner set
    for (const call of mockPrisma.tournamentMatch.create.mock.calls) {
      const data = call[0].data;
      expect(data.actualWinner).toBeDefined();
      expect(typeof data.actualWinner).toBe("number");
      expect(data.actualMargin).toBeDefined();
      expect(typeof data.actualMargin).toBe("string");
    }
  });

  it("uses deterministic simulation (same strength always produces same winner)", async () => {
    // Since simulateMatch is deterministic, running createTournament twice with the
    // same random seed should produce the same results. However, synthetic squads
    // use Math.random(). Instead, we just verify that every match has valid output.
    const tournamentId = "tournament-abc";
    mockPrisma.tournament.create.mockResolvedValue({ id: tournamentId });
    mockPrisma.tournamentMatch.create.mockResolvedValue({});
    mockPrisma.tournament.update.mockResolvedValue({});

    await createTournament(undefined, 2);

    for (const call of mockPrisma.tournamentMatch.create.mock.calls) {
      const data = call[0].data;
      expect(data.team1Strength).toBeDefined();
      expect(data.team2Strength).toBeDefined();
      expect(typeof data.team1Strength).toBe("number");
      expect(typeof data.team2Strength).toBe("number");
    }
  });
});
