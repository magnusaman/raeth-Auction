import { prisma } from "./db";
import { PrismaClient } from "@/generated/prisma/client";
import { loadIPLPlayerPool } from "./player-loader";
import {
  AuctionConfig,
  DEFAULT_AUCTION_CONFIG,
  AuctionStateForAgent,
  BidAction,
  PlayerRole,
  CurrentLotInfo,
  YourTeamInfo,
  SquadMember,
} from "./types";

type TxClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

// ─── Create a New Auction ────────────────────────────────────

export async function createAuction(): Promise<string> {
  const config = DEFAULT_AUCTION_CONFIG;
  const players = loadIPLPlayerPool();

  const auction = await prisma.auction.create({
    data: {
      config: JSON.stringify(config),
      status: "LOBBY",
    },
  });

  // Insert all players
  await prisma.auctionPlayer.createMany({
    data: players.map((p) => ({
      auctionId: auction.id,
      name: p.name,
      nationality: p.nationality,
      age: p.age,
      role: p.role,
      subType: p.subType,
      basePrice: p.basePrice,
      auctionOrder: (p as unknown as { auctionOrder: number }).auctionOrder,
      careerStats: JSON.stringify(p.careerStats),
      recentForm: JSON.stringify(p.recentForm),
      styleTags: JSON.stringify(p.styleTags),
      hiddenTrueValue: p.hiddenTrueValue,
      hiddenSeasonPerf: JSON.stringify(p.hiddenSeasonPerf),
      isTrap: p.isTrap,
      isSleeper: p.isSleeper,
    })),
  });

  // Create lots in auction order
  const dbPlayers = await prisma.auctionPlayer.findMany({
    where: { auctionId: auction.id },
    orderBy: { auctionOrder: "asc" },
  });

  await prisma.lot.createMany({
    data: dbPlayers.map((p, idx) => ({
      auctionId: auction.id,
      playerId: p.id,
      lotNumber: idx + 1,
      status: "PENDING",
    })),
  });

  return auction.id;
}

// ─── Join Auction ────────────────────────────────────────────

export async function joinAuction(
  auctionId: string,
  agentId: string,
  teamPreference?: number
): Promise<{ teamId: string; teamIndex: number }> {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: { teams: true },
  });

  if (!auction) throw new Error("Auction not found");
  if (auction.status !== "LOBBY") throw new Error("Auction already started");
  const maxTeams = (() => {
    try { const c = JSON.parse(auction.config); return c.maxTeams || 10; } catch { return 10; }
  })();
  if (auction.teams.length >= maxTeams) throw new Error("Auction full");

  // Check if agent already joined
  const existing = auction.teams.find((t) => t.agentId === agentId);
  if (existing) return { teamId: existing.id, teamIndex: existing.teamIndex };

  // Assign team index
  const takenIndices = new Set(auction.teams.map((t) => t.teamIndex));
  let teamIndex: number;

  if (teamPreference !== undefined && !takenIndices.has(teamPreference)) {
    teamIndex = teamPreference;
  } else {
    // Assign first available
    teamIndex = Array.from({ length: maxTeams }, (_, i) => i).find((i) => !takenIndices.has(i))!;
  }

  const config: AuctionConfig = JSON.parse(auction.config);

  const team = await prisma.auctionTeam.create({
    data: {
      auctionId,
      agentId,
      teamIndex,
      purseRemaining: config.pursePerTeam,
    },
  });

  return { teamId: team.id, teamIndex };
}

// ─── Start Auction ───────────────────────────────────────────

export async function startAuction(auctionId: string): Promise<void> {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: { teams: true },
  });

  if (!auction) throw new Error("Auction not found");
  if (auction.teams.length < 2) throw new Error("Need at least 2 teams to start");

  await prisma.auction.update({
    where: { id: auctionId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  // Start first lot
  const firstLot = await prisma.lot.findFirst({
    where: { auctionId, status: "PENDING" },
    orderBy: { lotNumber: "asc" },
  });

  if (firstLot) {
    await prisma.lot.update({
      where: { id: firstLot.id },
      data: { status: "BIDDING", startedAt: new Date() },
    });
  }
}

// ─── Get Auction State for Agent ─────────────────────────────

export async function getAuctionState(
  auctionId: string,
  teamId: string
): Promise<AuctionStateForAgent> {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      teams: { include: { agent: true, wonPlayers: true } },
      lots: {
        include: { player: true, bids: { orderBy: { timestamp: "desc" } } },
        orderBy: { lotNumber: "asc" },
      },
    },
  });

  if (!auction) throw new Error("Auction not found");

  const config: AuctionConfig = JSON.parse(auction.config);
  const myTeam = auction.teams.find((t) => t.id === teamId);
  if (!myTeam) throw new Error("Team not found in this auction");

  // Determine phase
  if (auction.status === "LOBBY") {
    return buildStateResponse("LOBBY", null, null, myTeam, auction, config);
  }

  if (auction.status === "COMPLETED") {
    return buildStateResponse("COMPLETE", null, null, myTeam, auction, config);
  }

  // Find current lot
  const currentLot = auction.lots.find((l) => l.status === "BIDDING");

  if (!currentLot) {
    // Check if there's a recently sold/unsold lot
    const lastLot = auction.lots
      .filter((l) => l.status === "SOLD" || l.status === "UNSOLD")
      .sort((a, b) => b.lotNumber - a.lotNumber)[0];

    if (lastLot) {
      const phase = lastLot.status === "SOLD" ? "SOLD" : "UNSOLD";
      const lotInfo = buildLotInfo(lastLot.player, lastLot.lotNumber);
      const lastBid = lastLot.bids[0];
      return buildStateResponse(
        phase as "SOLD" | "UNSOLD",
        lotInfo,
        lastBid ? { amount: lastBid.amount!, teamId: lastBid.teamId } : null,
        myTeam,
        auction,
        config
      );
    }

    return buildStateResponse("BETWEEN_LOTS", null, null, myTeam, auction, config);
  }

  const lotInfo = buildLotInfo(currentLot.player, currentLot.lotNumber);
  const lastBid = currentLot.bids.find((b) => b.action === "bid");

  return buildStateResponse(
    "BIDDING",
    lotInfo,
    lastBid ? { amount: lastBid.amount!, teamId: lastBid.teamId } : null,
    myTeam,
    auction,
    config
  );
}

function buildLotInfo(
  player: { id: string; name: string; role: string; subType: string; nationality: string; age: number; basePrice: number; careerStats: string; recentForm: string; styleTags: string },
  lotNumber: number
): CurrentLotInfo {
  return {
    playerId: player.id,
    lotNumber,
    name: player.name,
    role: player.role as PlayerRole,
    subType: player.subType as any,
    nationality: player.nationality,
    age: player.age,
    basePrice: player.basePrice,
    careerStats: JSON.parse(player.careerStats),
    recentForm: JSON.parse(player.recentForm),
    styleTags: JSON.parse(player.styleTags),
  };
}

function buildStateResponse(
  phase: AuctionStateForAgent["phase"],
  currentLot: CurrentLotInfo | null,
  currentBid: { amount: number; teamId: string } | null,
  myTeam: any,
  auction: any,
  config: AuctionConfig
): AuctionStateForAgent {
  // Build squad info
  const squad: SquadMember[] = (myTeam.wonPlayers || []).map((p: any) => ({
    playerId: p.id,
    name: p.name,
    role: p.role as PlayerRole,
    nationality: p.nationality,
    pricePaid: p.soldPrice || 0,
  }));

  const roleCounts: Record<PlayerRole, number> = {
    BATSMAN: 0,
    BOWLER: 0,
    ALL_ROUNDER: 0,
    WICKET_KEEPER: 0,
  };
  squad.forEach((p) => {
    roleCounts[p.role]++;
  });

  const yourTeam: YourTeamInfo = {
    teamId: myTeam.id,
    teamIndex: myTeam.teamIndex,
    purseRemaining: myTeam.purseRemaining,
    squad,
    squadSize: myTeam.squadSize,
    overseasCount: myTeam.overseasCount,
    roleCounts,
    needs: {
      batsmenNeeded: Math.max(0, config.minBatsmen - roleCounts.BATSMAN),
      bowlersNeeded: Math.max(0, config.minBowlers - roleCounts.BOWLER),
      allRoundersNeeded: Math.max(0, config.minAllRounders - roleCounts.ALL_ROUNDER),
      keepersNeeded: Math.max(0, config.minKeepers - roleCounts.WICKET_KEEPER),
      totalSlotsRemaining: config.maxSquadSize - myTeam.squadSize,
    },
  };

  const otherTeams = auction.teams
    .filter((t: any) => t.id !== myTeam.id)
    .map((t: any) => ({
      teamId: t.id,
      teamIndex: t.teamIndex,
      purseRemaining: t.purseRemaining,
      squadSize: t.squadSize,
      overseasCount: t.overseasCount,
    }));

  const lotsCompleted = auction.lots.filter(
    (l: any) => l.status === "SOLD" || l.status === "UNSOLD"
  ).length;

  return {
    phase,
    currentLot,
    currentBid,
    yourTeam,
    otherTeams,
    auctionProgress: {
      lotsCompleted,
      lotsRemaining: auction.lots.length - lotsCompleted,
    },
    timerSecondsRemaining: config.bidTimerSeconds,
  };
}

// ─── Process Bid ─────────────────────────────────────────────

export async function processBid(
  auctionId: string,
  teamId: string,
  action: BidAction
): Promise<{ success: boolean; message: string; newBidAmount?: number }> {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      teams: true,
      lots: {
        where: { status: "BIDDING" },
        include: { player: true, bids: { orderBy: { timestamp: "desc" } } },
      },
    },
  });

  if (!auction) return { success: false, message: "Auction not found" };
  if (auction.status !== "RUNNING") return { success: false, message: "Auction not running" };

  const currentLot = auction.lots[0];
  if (!currentLot) return { success: false, message: "No active lot" };

  const team = auction.teams.find((t) => t.id === teamId);
  if (!team) return { success: false, message: "Team not in this auction" };

  const config: AuctionConfig = JSON.parse(auction.config);

  // Handle PASS
  if (action.action === "pass") {
    const roundNum = currentLot.bids.length + 1;
    await prisma.bid.create({
      data: {
        lotId: currentLot.id,
        teamId,
        action: "pass",
        reasoning: action.reasoning || "",
        roundNumber: roundNum,
      },
    });

    // Check if all teams have passed (lot goes unsold or sold to last bidder)
    await checkLotCompletion(auctionId, currentLot.id, config);

    return { success: true, message: "Passed" };
  }

  // Handle BID — IPL rules: opening bid = base price, then fixed increments only
  const lastBid = currentLot.bids.find((b) => b.action === "bid");
  const currentPrice = lastBid ? lastBid.amount! : currentLot.player.basePrice;

  // In IPL, bid amount is determined by the rules, not the bidder.
  // Opening bid = base price. Subsequent bids = current price + increment.
  let bidAmount: number;
  if (!lastBid) {
    // Opening bid is always at base price
    bidAmount = currentLot.player.basePrice;
  } else {
    // Subsequent bids go up by exactly one increment
    const increment = getIncrement(currentPrice, config);
    bidAmount = Math.round((currentPrice + increment) * 10) / 10;
  }

  // Hard cap: no single player can exceed maxPlayerPrice (prevents runaway bidding wars)
  const maxPrice = config.maxPlayerPrice || 25;
  if (bidAmount > maxPrice) {
    return { success: false, message: `Exceeds max player price (₹${maxPrice} Cr)` };
  }

  // Check purse
  if (bidAmount > team.purseRemaining) {
    return { success: false, message: "Insufficient purse" };
  }

  // Check if team can still afford minimum squad
  const slotsNeeded = Math.max(0, config.minSquadSize - team.squadSize - 1);
  const minReserve = slotsNeeded * 0.5; // minimum ₹0.5 Cr per remaining slot
  if (team.purseRemaining - bidAmount < minReserve) {
    return {
      success: false,
      message: `Must reserve ₹${minReserve} Cr for ${slotsNeeded} remaining slots`,
    };
  }

  // Check squad size limit
  if (team.squadSize >= config.maxSquadSize) {
    return { success: false, message: "Squad full" };
  }

  // Check overseas limit
  if (
    currentLot.player.nationality !== "India" &&
    team.overseasCount >= config.maxOverseas
  ) {
    return { success: false, message: "Overseas slots full" };
  }

  // Place bid
  const roundNum = currentLot.bids.length + 1;
  await prisma.bid.create({
    data: {
      lotId: currentLot.id,
      teamId,
      action: "bid",
      amount: bidAmount,
      reasoning: action.reasoning || "",
      roundNumber: roundNum,
    },
  });

  return { success: true, message: "Bid placed", newBidAmount: bidAmount };
}

function getIncrement(currentBid: number, config: AuctionConfig): number {
  for (const tier of config.bidIncrements) {
    if (currentBid < tier.upTo) return tier.increment;
  }
  return config.bidIncrements[config.bidIncrements.length - 1].increment;
}

// ─── Check Lot Completion ────────────────────────────────────

export async function checkLotCompletion(
  auctionId: string,
  lotId: string,
  _config: AuctionConfig
): Promise<{ completed: boolean; status?: "SOLD" | "UNSOLD" }> {
  return await prisma.$transaction(async (tx) => {
    const lot = await tx.lot.findUnique({
      where: { id: lotId },
      include: {
        bids: { orderBy: { timestamp: "desc" } },
        player: true,
      },
    });

    if (!lot) return { completed: false };

    // Guard: if lot is already completed, don't process again
    if (lot.status === "SOLD" || lot.status === "UNSOLD") {
      return { completed: true, status: lot.status as "SOLD" | "UNSOLD" };
    }

    const auction = await tx.auction.findUnique({
      where: { id: auctionId },
      include: { teams: true },
    });
    if (!auction) return { completed: false };

    // Get recent round of responses — all teams that responded after the last bid
    const lastBid = lot.bids.find((b) => b.action === "bid");

    if (!lastBid) {
      // No bids at all — check if all unique teams passed
      const uniquePassedTeams = new Set(
        lot.bids.filter((b) => b.action === "pass").map((b) => b.teamId)
      );
      if (uniquePassedTeams.size >= auction.teams.length) {
        // Lot unsold
        await tx.lot.update({
          where: { id: lotId },
          data: { status: "UNSOLD", endedAt: new Date() },
        });
        await tx.auctionPlayer.update({
          where: { id: lot.playerId },
          data: { isUnsold: true },
        });
        await advanceToNextLot(auctionId, tx);
        return { completed: true, status: "UNSOLD" };
      }
      return { completed: false };
    }

    // IPL rule: a team that passes at ANY point is out for this lot.
    // Collect all teams that have ever passed during this lot.
    const allDroppedTeams = new Set(
      lot.bids.filter((b) => b.action === "pass").map((b) => b.teamId)
    );
    const otherTeams = auction.teams.filter((t) => t.id !== lastBid.teamId);

    // SOLD if all other teams have dropped out (passed at any point)
    if (otherTeams.every((t) => allDroppedTeams.has(t.id))) {
      const winnerTeam = auction.teams.find((t) => t.id === lastBid.teamId)!;

      // Update lot
      await tx.lot.update({
        where: { id: lotId },
        data: {
          status: "SOLD",
          finalPrice: lastBid.amount,
          winnerId: lastBid.teamId,
          endedAt: new Date(),
        },
      });

      // Update player
      await tx.auctionPlayer.update({
        where: { id: lot.playerId },
        data: {
          soldPrice: lastBid.amount,
          wonByTeamId: lastBid.teamId,
        },
      });

      // Update team purse and counts
      const isOverseas = lot.player.nationality !== "India";
      await tx.auctionTeam.update({
        where: { id: lastBid.teamId },
        data: {
          purseRemaining: winnerTeam.purseRemaining - lastBid.amount!,
          squadSize: winnerTeam.squadSize + 1,
          overseasCount: isOverseas
            ? winnerTeam.overseasCount + 1
            : winnerTeam.overseasCount,
        },
      });

      await advanceToNextLot(auctionId, tx);
      return { completed: true, status: "SOLD" };
    }

    return { completed: false };
  });
}

// ─── Advance to Next Lot ─────────────────────────────────────

async function advanceToNextLot(auctionId: string, tx: TxClient = prisma as unknown as TxClient): Promise<void> {
  const nextLot = await tx.lot.findFirst({
    where: { auctionId, status: "PENDING" },
    orderBy: { lotNumber: "asc" },
  });

  if (!nextLot) {
    // Auction complete
    await tx.auction.update({
      where: { id: auctionId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    return;
  }

  await tx.lot.update({
    where: { id: nextLot.id },
    data: { status: "BIDDING", startedAt: new Date() },
  });
}

// ─── Get Next Bidder ─────────────────────────────────────────
// Returns the team ID that should bid next (round-robin, skip passed teams)

export async function getNextBidder(
  auctionId: string,
  lotId: string
): Promise<string | null> {
  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    include: { bids: { orderBy: { timestamp: "asc" } } },
  });

  if (!lot || lot.status !== "BIDDING") return null;

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: { teams: { orderBy: { teamIndex: "asc" } } },
  });

  if (!auction) return null;

  const teamIds = auction.teams.map((t) => t.id);

  // IPL rule: once a team passes on a lot, they are OUT for that lot.
  // Collect ALL teams that have passed at ANY point during this lot.
  const droppedOutTeams = new Set(
    lot.bids.filter((b) => b.action === "pass").map((b) => b.teamId)
  );

  const lastBid = [...lot.bids].reverse().find((b) => b.action === "bid");

  if (!lastBid) {
    // No bids yet — find first team that hasn't dropped out
    for (const tid of teamIds) {
      if (!droppedOutTeams.has(tid)) return tid;
    }
    return null; // All teams passed
  }

  // The current highest bidder doesn't need to respond to their own bid
  const excludedTeams = new Set([...droppedOutTeams, lastBid.teamId]);

  // Find teams that haven't responded since the last bid AND haven't dropped out
  const bidsAfterLastBid = lot.bids.filter(
    (b) => b.timestamp > lastBid.timestamp
  );
  const respondedSinceLastBid = new Set(bidsAfterLastBid.map((b) => b.teamId));

  // Find next team in round-robin that still needs to respond
  const lastBidderIdx = auction.teams.findIndex((t) => t.id === lastBid.teamId);
  const numTeams = teamIds.length;
  for (let i = 1; i <= numTeams; i++) {
    const nextIdx = (lastBidderIdx + i) % numTeams;
    const nextTeamId = teamIds[nextIdx];
    // Skip: already dropped out, is the current bidder, or already responded this round
    if (!excludedTeams.has(nextTeamId) && !respondedSinceLastBid.has(nextTeamId)) {
      return nextTeamId;
    }
  }

  return null; // All remaining teams have responded or dropped out
}
