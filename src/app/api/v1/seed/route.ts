import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { loadIPLPlayerPool } from "@/lib/player-loader";
import { DEFAULT_AUCTION_CONFIG } from "@/lib/types";

// POST /api/v1/seed — Create a completed auction with realistic results
export async function POST() {
  try {
    const config = DEFAULT_AUCTION_CONFIG;
    const players = loadIPLPlayerPool();

    // 1. Create 4 agents (one per team)
    const agentNames = [
      { name: "Claude-Strategist", desc: "Claude-based auction agent" },
      { name: "GPT-Tactician", desc: "GPT-based auction agent" },
      { name: "Gemini-Scout", desc: "Gemini-based auction agent" },
      { name: "Llama-Maverick", desc: "Llama-based auction agent" },
    ];

    const agents = [];
    for (const a of agentNames) {
      const existing = await prisma.agent.findUnique({ where: { name: a.name } });
      if (existing) {
        agents.push(existing);
      } else {
        const agent = await prisma.agent.create({
          data: {
            name: a.name,
            description: a.desc,
            apiKey: `seed_${a.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}`,
          },
        });
        agents.push(agent);
      }
    }

    // 2. Create auction (COMPLETED)
    const auction = await prisma.auction.create({
      data: {
        config: JSON.stringify(config),
        status: "COMPLETED",
        startedAt: new Date(Date.now() - 3600000), // 1 hour ago
        completedAt: new Date(),
      },
    });

    // 3. Insert all players
    await prisma.auctionPlayer.createMany({
      data: players.map((p, idx) => ({
        auctionId: auction.id,
        name: p.name,
        nationality: p.nationality,
        age: p.age,
        role: p.role,
        subType: p.subType,
        basePrice: p.basePrice,
        auctionOrder: idx + 1,
        careerStats: JSON.stringify(p.careerStats),
        recentForm: JSON.stringify(p.recentForm),
        styleTags: JSON.stringify(p.styleTags),
        hiddenTrueValue: p.hiddenTrueValue,
        hiddenSeasonPerf: JSON.stringify(p.hiddenSeasonPerf),
        isTrap: p.isTrap,
        isSleeper: p.isSleeper,
      })),
    });

    // 4. Create auction teams
    const teamRecords = [];
    for (let i = 0; i < 4; i++) {
      const team = await prisma.auctionTeam.create({
        data: {
          auctionId: auction.id,
          agentId: agents[i].id,
          teamIndex: i,
          purseRemaining: config.pursePerTeam, // will update after
        },
      });
      teamRecords.push(team);
    }

    // 5. Load DB players (to get their IDs)
    const dbPlayers = await prisma.auctionPlayer.findMany({
      where: { auctionId: auction.id },
      orderBy: { auctionOrder: "asc" },
    });

    // 6. Simulate auction results — distribute players across teams
    // Strategy: go through players in auction order, simulate bidding
    const teamState = teamRecords.map((t) => ({
      id: t.id,
      teamIndex: t.teamIndex,
      purse: config.pursePerTeam,
      squad: 0,
      overseas: 0,
      roles: { BATSMAN: 0, BOWLER: 0, ALL_ROUNDER: 0, WICKET_KEEPER: 0 } as Record<string, number>,
    }));

    let soldCount = 0;
    let unsoldCount = 0;

    for (let pIdx = 0; pIdx < dbPlayers.length; pIdx++) {
      const player = dbPlayers[pIdx];
      const isOverseas = player.nationality !== "India";

      // Find eligible teams that can bid
      const eligible = teamState.filter((t) => {
        if (t.squad >= config.maxSquadSize) return false;
        if (isOverseas && t.overseas >= config.maxOverseas) return false;
        const slotsNeeded = Math.max(0, config.minSquadSize - t.squad - 1);
        if (t.purse - player.basePrice < slotsNeeded * 0.5) return false;
        return true;
      });

      // ~75% of players get sold
      const shouldSell = eligible.length > 0 && (
        pIdx < 30 || // top 30 always sell
        Math.random() < 0.65 // rest have 65% chance
      );

      // Create lot record
      const lotNumber = pIdx + 1;

      if (!shouldSell || eligible.length === 0) {
        // UNSOLD
        const lot = await prisma.lot.create({
          data: {
            auctionId: auction.id,
            playerId: player.id,
            lotNumber,
            status: "UNSOLD",
            startedAt: new Date(Date.now() - 3600000 + pIdx * 45000),
            endedAt: new Date(Date.now() - 3600000 + pIdx * 45000 + 30000),
          },
        });

        // All 4 teams pass
        for (const t of teamState) {
          await prisma.bid.create({
            data: {
              lotId: lot.id,
              teamId: t.id,
              action: "pass",
              reasoning: `Passing on ${player.name} — ${["not a priority role", "saving purse for later picks", "squad needs filled elsewhere", "price not justified by stats"][Math.floor(Math.random() * 4)]}`,
              roundNumber: 1,
            },
          });
        }

        await prisma.auctionPlayer.update({
          where: { id: player.id },
          data: { isUnsold: true },
        });

        unsoldCount++;
        continue;
      }

      // SOLD — pick a winning team (weighted by need and purse)
      const teamWeights = eligible.map((t) => {
        let weight = 1;
        // Teams with more purse are more likely to win
        weight += t.purse / 30;
        // Teams with fewer players need more
        weight += (config.minSquadSize - t.squad) * 0.5;
        // Teams needing this role get a boost
        const roleNeeded = getRoleNeed(t, player.role, config);
        weight += roleNeeded * 3;
        return { team: t, weight };
      });

      const totalWeight = teamWeights.reduce((s, w) => s + w.weight, 0);
      let rand = Math.random() * totalWeight;
      let winner = teamWeights[0].team;
      for (const tw of teamWeights) {
        rand -= tw.weight;
        if (rand <= 0) { winner = tw.team; break; }
      }

      // Determine sold price: base price + some bidding premium
      const hiddenPerf = JSON.parse(player.hiddenSeasonPerf || "{}");
      const qualityFactor = (hiddenPerf.impactScore || 50) / 50; // 0-2 range
      const bidRounds = Math.floor(Math.random() * 4) + 1; // 1-4 bidding rounds
      let soldPrice = player.basePrice;

      for (let r = 0; r < bidRounds; r++) {
        const increment = getIncrement(soldPrice, config);
        soldPrice = Math.round((soldPrice + increment) * 10) / 10;
      }

      // High-quality players get bid up more
      if (qualityFactor > 1.2) {
        const extraRounds = Math.floor(Math.random() * 5) + 2;
        for (let r = 0; r < extraRounds; r++) {
          const increment = getIncrement(soldPrice, config);
          soldPrice = Math.round((soldPrice + increment) * 10) / 10;
        }
      }

      // Cap at what the team can afford
      const slotsStillNeeded = Math.max(0, config.minSquadSize - winner.squad - 1);
      const maxAfford = winner.purse - slotsStillNeeded * 0.5;
      soldPrice = Math.min(soldPrice, maxAfford);
      soldPrice = Math.round(soldPrice * 10) / 10;

      // Create lot
      const lot = await prisma.lot.create({
        data: {
          auctionId: auction.id,
          playerId: player.id,
          lotNumber,
          status: "SOLD",
          finalPrice: soldPrice,
          winnerId: winner.id,
          startedAt: new Date(Date.now() - 3600000 + pIdx * 45000),
          endedAt: new Date(Date.now() - 3600000 + pIdx * 45000 + bidRounds * 15000),
        },
      });

      // Create bid records (simulate a bidding war)
      let currentBid = player.basePrice;
      const competitors = eligible.filter((t) => t.id !== winner.id).slice(0, 2);
      let roundNum = 0;

      // Opening bid by winner or a competitor
      const opener = competitors.length > 0 && Math.random() < 0.5 ? competitors[0] : winner;
      roundNum++;
      await prisma.bid.create({
        data: {
          lotId: lot.id,
          teamId: opener.id,
          action: "bid",
          amount: currentBid,
          reasoning: `Opening bid for ${player.name} (${player.role}) at base price`,
          roundNumber: roundNum,
        },
      });

      // Simulate a few more rounds
      while (currentBid < soldPrice && roundNum < 12) {
        const increment = getIncrement(currentBid, config);
        currentBid = Math.round((currentBid + increment) * 10) / 10;
        if (currentBid > soldPrice) currentBid = soldPrice;
        roundNum++;

        const bidder = currentBid >= soldPrice ? winner : (Math.random() < 0.5 ? winner : (competitors[Math.floor(Math.random() * competitors.length)] || winner));

        await prisma.bid.create({
          data: {
            lotId: lot.id,
            teamId: bidder.id,
            action: "bid",
            amount: currentBid,
            reasoning: `${currentBid >= soldPrice ? "Final bid" : "Counter-bid"} — ${player.name} valued for ${["squad balance", "match-winning ability", "filling role gap", "strong recent form"][Math.floor(Math.random() * 4)]}`,
            roundNumber: roundNum,
          },
        });
      }

      // Non-winners pass
      for (const t of teamState.filter((t) => t.id !== winner.id)) {
        roundNum++;
        await prisma.bid.create({
          data: {
            lotId: lot.id,
            teamId: t.id,
            action: "pass",
            reasoning: `Letting ${player.name} go — ${["price too high", "other priorities", "role already filled", "saving purse"][Math.floor(Math.random() * 4)]}`,
            roundNumber: roundNum,
          },
        });
      }

      // Update player record
      await prisma.auctionPlayer.update({
        where: { id: player.id },
        data: { soldPrice, wonByTeamId: winner.id },
      });

      // Update team state
      winner.purse = Math.round((winner.purse - soldPrice) * 10) / 10;
      winner.squad++;
      if (isOverseas) winner.overseas++;
      winner.roles[player.role] = (winner.roles[player.role] || 0) + 1;

      soldCount++;
    }

    // 7. Update team records with final state
    for (const t of teamState) {
      await prisma.auctionTeam.update({
        where: { id: t.id },
        data: {
          purseRemaining: t.purse,
          squadSize: t.squad,
          overseasCount: t.overseas,
        },
      });
    }

    return NextResponse.json({
      success: true,
      auctionId: auction.id,
      summary: {
        totalPlayers: players.length,
        sold: soldCount,
        unsold: unsoldCount,
        teams: teamState.map((t) => ({
          teamIndex: t.teamIndex,
          squad: t.squad,
          overseas: t.overseas,
          purseRemaining: t.purse,
          roles: t.roles,
        })),
      },
    });
  } catch (error: any) {
    console.error("[Seed] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function getIncrement(currentBid: number, config: typeof DEFAULT_AUCTION_CONFIG): number {
  for (const tier of config.bidIncrements) {
    if (currentBid < tier.upTo) return tier.increment;
  }
  return config.bidIncrements[config.bidIncrements.length - 1].increment;
}

function getRoleNeed(
  team: { roles: Record<string, number> },
  role: string,
  config: typeof DEFAULT_AUCTION_CONFIG
): number {
  const mins: Record<string, number> = {
    BATSMAN: config.minBatsmen,
    BOWLER: config.minBowlers,
    ALL_ROUNDER: config.minAllRounders,
    WICKET_KEEPER: config.minKeepers,
  };
  const have = team.roles[role] || 0;
  const need = mins[role] || 0;
  return Math.max(0, need - have);
}
