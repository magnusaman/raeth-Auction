import { describe, it, expect, vi, beforeEach } from "vitest";
import { DEFAULT_AUCTION_CONFIG, type AuctionConfig } from "@/lib/types";

// ─── Mock Prisma (use vi.hoisted so the variable is available in vi.mock factory) ──

const mockPrisma = vi.hoisted(() => {
  const mock = {
    auction: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auctionTeam: {
      create: vi.fn(),
      update: vi.fn(),
    },
    auctionPlayer: {
      createMany: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    lot: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
    },
    bid: {
      create: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: typeof mock) => Promise<unknown>) => fn(mock)),
  };
  return mock;
});

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

// Also mock player-loader since createAuction imports it
vi.mock("@/lib/player-loader", () => ({
  loadIPLPlayerPool: vi.fn(() => []),
}));

import { processBid, checkLotCompletion, getNextBidder } from "@/lib/auction-engine";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Helper to build mock auction data ──────────────────────

function mockAuctionWithLot(overrides: {
  teamPurse?: number;
  teamSquadSize?: number;
  teamOverseasCount?: number;
  playerNationality?: string;
  playerBasePrice?: number;
  existingBids?: { action: string; amount?: number; teamId: string; timestamp?: Date }[];
  maxPlayerPrice?: number;
}) {
  const config: AuctionConfig = {
    ...DEFAULT_AUCTION_CONFIG,
    ...(overrides.maxPlayerPrice !== undefined ? { maxPlayerPrice: overrides.maxPlayerPrice } : {}),
  };

  const teamId = "team-1";
  const bids = (overrides.existingBids || []).map((b, i) => ({
    id: `bid-${i}`,
    action: b.action,
    amount: b.amount ?? null,
    teamId: b.teamId,
    reasoning: "",
    roundNumber: i + 1,
    timestamp: b.timestamp ?? new Date(Date.now() - (100 - i)),
    lotId: "lot-1",
  }));

  return {
    id: "auction-1",
    status: "RUNNING",
    config: JSON.stringify(config),
    teams: [
      {
        id: teamId,
        teamIndex: 0,
        agentId: "agent-1",
        auctionId: "auction-1",
        purseRemaining: overrides.teamPurse ?? 100,
        squadSize: overrides.teamSquadSize ?? 0,
        overseasCount: overrides.teamOverseasCount ?? 0,
      },
      {
        id: "team-2",
        teamIndex: 1,
        agentId: "agent-2",
        auctionId: "auction-1",
        purseRemaining: 100,
        squadSize: 0,
        overseasCount: 0,
      },
    ],
    lots: [
      {
        id: "lot-1",
        auctionId: "auction-1",
        playerId: "player-1",
        lotNumber: 1,
        status: "BIDDING",
        player: {
          id: "player-1",
          name: "Test Player",
          nationality: overrides.playerNationality ?? "India",
          basePrice: overrides.playerBasePrice ?? 2,
          role: "BATSMAN",
          subType: "anchor",
        },
        bids,
      },
    ],
  };
}

// ─── processBid ─────────────────────────────────────────────

describe("processBid", () => {
  it("rejects bid when auction is not found", async () => {
    mockPrisma.auction.findUnique.mockResolvedValue(null);
    const result = await processBid("auction-1", "team-1", { action: "bid" });
    expect(result.success).toBe(false);
    expect(result.message).toBe("Auction not found");
  });

  it("rejects bid when auction is not running", async () => {
    mockPrisma.auction.findUnique.mockResolvedValue({
      id: "auction-1",
      status: "LOBBY",
      config: JSON.stringify(DEFAULT_AUCTION_CONFIG),
      teams: [],
      lots: [],
    });
    const result = await processBid("auction-1", "team-1", { action: "bid" });
    expect(result.success).toBe(false);
    expect(result.message).toBe("Auction not running");
  });

  it("rejects bid when no active lot", async () => {
    mockPrisma.auction.findUnique.mockResolvedValue({
      id: "auction-1",
      status: "RUNNING",
      config: JSON.stringify(DEFAULT_AUCTION_CONFIG),
      teams: [{ id: "team-1" }],
      lots: [],
    });
    const result = await processBid("auction-1", "team-1", { action: "bid" });
    expect(result.success).toBe(false);
    expect(result.message).toBe("No active lot");
  });

  it("rejects bid when team not in auction", async () => {
    const auction = mockAuctionWithLot({});
    mockPrisma.auction.findUnique.mockResolvedValue(auction);
    const result = await processBid("auction-1", "unknown-team", { action: "bid" });
    expect(result.success).toBe(false);
    expect(result.message).toBe("Team not in this auction");
  });

  it("rejects bid when purse is insufficient", async () => {
    const auction = mockAuctionWithLot({ teamPurse: 1, playerBasePrice: 2 });
    mockPrisma.auction.findUnique.mockResolvedValue(auction);
    const result = await processBid("auction-1", "team-1", { action: "bid" });
    expect(result.success).toBe(false);
    expect(result.message).toBe("Insufficient purse");
  });

  it("rejects bid when squad is full", async () => {
    const auction = mockAuctionWithLot({ teamSquadSize: 20 });
    mockPrisma.auction.findUnique.mockResolvedValue(auction);
    const result = await processBid("auction-1", "team-1", { action: "bid" });
    expect(result.success).toBe(false);
    expect(result.message).toBe("Squad full");
  });

  it("rejects bid when overseas slots are full for overseas player", async () => {
    const auction = mockAuctionWithLot({
      playerNationality: "Australia",
      teamOverseasCount: 8,
    });
    mockPrisma.auction.findUnique.mockResolvedValue(auction);
    const result = await processBid("auction-1", "team-1", { action: "bid" });
    expect(result.success).toBe(false);
    expect(result.message).toBe("Overseas slots full");
  });

  it("allows bid for overseas player when slots remain", async () => {
    const auction = mockAuctionWithLot({
      playerNationality: "Australia",
      teamOverseasCount: 5,
      playerBasePrice: 2,
    });
    mockPrisma.auction.findUnique.mockResolvedValue(auction);
    mockPrisma.bid.create.mockResolvedValue({});
    const result = await processBid("auction-1", "team-1", { action: "bid" });
    expect(result.success).toBe(true);
    expect(result.newBidAmount).toBe(2); // opening bid = base price
  });

  it("places opening bid at base price", async () => {
    const auction = mockAuctionWithLot({ playerBasePrice: 2 });
    mockPrisma.auction.findUnique.mockResolvedValue(auction);
    mockPrisma.bid.create.mockResolvedValue({});
    const result = await processBid("auction-1", "team-1", { action: "bid" });
    expect(result.success).toBe(true);
    expect(result.newBidAmount).toBe(2);
  });

  it("increments bid correctly for subsequent bids", async () => {
    // Existing bid at 2 Cr. Increment for <5 Cr is 0.25
    const auction = mockAuctionWithLot({
      playerBasePrice: 2,
      existingBids: [{ action: "bid", amount: 2, teamId: "team-2" }],
    });
    mockPrisma.auction.findUnique.mockResolvedValue(auction);
    mockPrisma.bid.create.mockResolvedValue({});
    const result = await processBid("auction-1", "team-1", { action: "bid" });
    expect(result.success).toBe(true);
    expect(result.newBidAmount).toBe(2.3); // 2 < 2 is false, next tier 2 < 5 => increment 0.25, Math.round((2+0.25)*10)/10 = 2.3
  });

  it("records a pass action", async () => {
    const auction = mockAuctionWithLot({});
    mockPrisma.auction.findUnique.mockResolvedValue(auction);
    mockPrisma.bid.create.mockResolvedValue({});
    // checkLotCompletion will be called after pass — mock its dependencies
    mockPrisma.lot.findUnique.mockResolvedValue({
      id: "lot-1",
      status: "BIDDING",
      playerId: "player-1",
      player: { nationality: "India" },
      bids: [{ action: "pass", teamId: "team-1", timestamp: new Date() }],
    });
    mockPrisma.auction.findUnique.mockResolvedValue(auction);
    const result = await processBid("auction-1", "team-1", { action: "pass", reasoning: "too pricey" });
    expect(result.success).toBe(true);
    expect(result.message).toBe("Passed");
    expect(mockPrisma.bid.create).toHaveBeenCalled();
  });

  it("rejects bid that exceeds max player price", async () => {
    // Set up a scenario where the next bid would exceed the max player price
    const auction = mockAuctionWithLot({
      playerBasePrice: 2,
      maxPlayerPrice: 5,
      existingBids: [{ action: "bid", amount: 5, teamId: "team-2" }],
    });
    mockPrisma.auction.findUnique.mockResolvedValue(auction);
    const result = await processBid("auction-1", "team-1", { action: "bid" });
    expect(result.success).toBe(false);
    expect(result.message).toContain("Exceeds max player price");
  });
});

// ─── checkLotCompletion ─────────────────────────────────────

describe("checkLotCompletion", () => {
  it("returns UNSOLD when all teams pass with no bids", async () => {
    mockPrisma.lot.findUnique.mockResolvedValue({
      id: "lot-1",
      status: "BIDDING",
      playerId: "player-1",
      player: { nationality: "India" },
      bids: [
        { action: "pass", teamId: "team-1", timestamp: new Date() },
        { action: "pass", teamId: "team-2", timestamp: new Date() },
      ],
    });
    mockPrisma.auction.findUnique.mockResolvedValue({
      id: "auction-1",
      teams: [
        { id: "team-1", teamIndex: 0, purseRemaining: 100, squadSize: 0, overseasCount: 0 },
        { id: "team-2", teamIndex: 1, purseRemaining: 100, squadSize: 0, overseasCount: 0 },
      ],
    });
    mockPrisma.lot.update.mockResolvedValue({});
    mockPrisma.auctionPlayer.update.mockResolvedValue({});
    mockPrisma.lot.findFirst.mockResolvedValue(null); // no next lot
    mockPrisma.auction.update.mockResolvedValue({});

    const result = await checkLotCompletion("auction-1", "lot-1", DEFAULT_AUCTION_CONFIG);
    expect(result.completed).toBe(true);
    expect(result.status).toBe("UNSOLD");
  });

  it("returns SOLD when all other teams have passed after a bid", async () => {
    mockPrisma.lot.findUnique.mockResolvedValue({
      id: "lot-1",
      status: "BIDDING",
      playerId: "player-1",
      player: { nationality: "India" },
      bids: [
        { action: "bid", amount: 2, teamId: "team-1", timestamp: new Date(1000) },
        { action: "pass", teamId: "team-2", timestamp: new Date(2000) },
      ],
    });
    mockPrisma.auction.findUnique.mockResolvedValue({
      id: "auction-1",
      teams: [
        { id: "team-1", teamIndex: 0, purseRemaining: 100, squadSize: 0, overseasCount: 0 },
        { id: "team-2", teamIndex: 1, purseRemaining: 100, squadSize: 0, overseasCount: 0 },
      ],
    });
    mockPrisma.lot.update.mockResolvedValue({});
    mockPrisma.auctionPlayer.update.mockResolvedValue({});
    mockPrisma.auctionTeam.update.mockResolvedValue({});
    mockPrisma.lot.findFirst.mockResolvedValue(null);
    mockPrisma.auction.update.mockResolvedValue({});

    const result = await checkLotCompletion("auction-1", "lot-1", DEFAULT_AUCTION_CONFIG);
    expect(result.completed).toBe(true);
    expect(result.status).toBe("SOLD");
  });

  it("returns not completed when some teams have not responded", async () => {
    mockPrisma.lot.findUnique.mockResolvedValue({
      id: "lot-1",
      status: "BIDDING",
      playerId: "player-1",
      player: { nationality: "India" },
      bids: [
        { action: "bid", amount: 2, teamId: "team-1", timestamp: new Date(1000) },
        // team-2 has not responded yet
      ],
    });
    mockPrisma.auction.findUnique.mockResolvedValue({
      id: "auction-1",
      teams: [
        { id: "team-1", teamIndex: 0 },
        { id: "team-2", teamIndex: 1 },
      ],
    });

    const result = await checkLotCompletion("auction-1", "lot-1", DEFAULT_AUCTION_CONFIG);
    expect(result.completed).toBe(false);
  });

  it("returns completed=true with existing status if lot already SOLD", async () => {
    mockPrisma.lot.findUnique.mockResolvedValue({
      id: "lot-1",
      status: "SOLD",
      playerId: "player-1",
      player: { nationality: "India" },
      bids: [],
    });

    const result = await checkLotCompletion("auction-1", "lot-1", DEFAULT_AUCTION_CONFIG);
    expect(result.completed).toBe(true);
    expect(result.status).toBe("SOLD");
  });

  it("returns completed=false if lot not found", async () => {
    mockPrisma.lot.findUnique.mockResolvedValue(null);
    const result = await checkLotCompletion("auction-1", "lot-1", DEFAULT_AUCTION_CONFIG);
    expect(result.completed).toBe(false);
  });
});

// ─── getNextBidder ──────────────────────────────────────────

describe("getNextBidder", () => {
  it("returns first team when no bids exist", async () => {
    mockPrisma.lot.findUnique.mockResolvedValue({
      id: "lot-1",
      status: "BIDDING",
      bids: [],
    });
    mockPrisma.auction.findUnique.mockResolvedValue({
      id: "auction-1",
      teams: [
        { id: "team-1", teamIndex: 0 },
        { id: "team-2", teamIndex: 1 },
        { id: "team-3", teamIndex: 2 },
      ],
    });

    const nextBidder = await getNextBidder("auction-1", "lot-1");
    expect(nextBidder).toBe("team-1");
  });

  it("returns next team in round-robin after a bid", async () => {
    const bidTimestamp = new Date(1000);
    mockPrisma.lot.findUnique.mockResolvedValue({
      id: "lot-1",
      status: "BIDDING",
      bids: [
        { action: "bid", amount: 2, teamId: "team-1", timestamp: bidTimestamp },
      ],
    });
    mockPrisma.auction.findUnique.mockResolvedValue({
      id: "auction-1",
      teams: [
        { id: "team-1", teamIndex: 0 },
        { id: "team-2", teamIndex: 1 },
        { id: "team-3", teamIndex: 2 },
      ],
    });

    const nextBidder = await getNextBidder("auction-1", "lot-1");
    expect(nextBidder).toBe("team-2");
  });

  it("skips teams that have passed", async () => {
    const t0 = new Date(1000);
    const t1 = new Date(2000);
    mockPrisma.lot.findUnique.mockResolvedValue({
      id: "lot-1",
      status: "BIDDING",
      bids: [
        { action: "bid", amount: 2, teamId: "team-1", timestamp: t0 },
        { action: "pass", teamId: "team-2", timestamp: t1 },
      ],
    });
    mockPrisma.auction.findUnique.mockResolvedValue({
      id: "auction-1",
      teams: [
        { id: "team-1", teamIndex: 0 },
        { id: "team-2", teamIndex: 1 },
        { id: "team-3", teamIndex: 2 },
      ],
    });

    const nextBidder = await getNextBidder("auction-1", "lot-1");
    expect(nextBidder).toBe("team-3");
  });

  it("returns null when all teams have passed or are excluded", async () => {
    const t0 = new Date(1000);
    const t1 = new Date(2000);
    const t2 = new Date(3000);
    mockPrisma.lot.findUnique.mockResolvedValue({
      id: "lot-1",
      status: "BIDDING",
      bids: [
        { action: "bid", amount: 2, teamId: "team-1", timestamp: t0 },
        { action: "pass", teamId: "team-2", timestamp: t1 },
        { action: "pass", teamId: "team-3", timestamp: t2 },
      ],
    });
    mockPrisma.auction.findUnique.mockResolvedValue({
      id: "auction-1",
      teams: [
        { id: "team-1", teamIndex: 0 },
        { id: "team-2", teamIndex: 1 },
        { id: "team-3", teamIndex: 2 },
      ],
    });

    const nextBidder = await getNextBidder("auction-1", "lot-1");
    expect(nextBidder).toBeNull();
  });

  it("returns null when lot is not in BIDDING status", async () => {
    mockPrisma.lot.findUnique.mockResolvedValue({
      id: "lot-1",
      status: "SOLD",
      bids: [],
    });

    const nextBidder = await getNextBidder("auction-1", "lot-1");
    expect(nextBidder).toBeNull();
  });

  it("returns null when lot not found", async () => {
    mockPrisma.lot.findUnique.mockResolvedValue(null);
    const nextBidder = await getNextBidder("auction-1", "lot-1");
    expect(nextBidder).toBeNull();
  });

  it("skips first team if they passed, returns second", async () => {
    mockPrisma.lot.findUnique.mockResolvedValue({
      id: "lot-1",
      status: "BIDDING",
      bids: [
        { action: "pass", teamId: "team-1", timestamp: new Date(1000) },
      ],
    });
    mockPrisma.auction.findUnique.mockResolvedValue({
      id: "auction-1",
      teams: [
        { id: "team-1", teamIndex: 0 },
        { id: "team-2", teamIndex: 1 },
      ],
    });

    const nextBidder = await getNextBidder("auction-1", "lot-1");
    expect(nextBidder).toBe("team-2");
  });
});
