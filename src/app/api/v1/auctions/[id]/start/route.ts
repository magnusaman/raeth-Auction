import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  startAuction,
  getAuctionState,
  processBid,
  getNextBidder,
  checkLotCompletion,
} from "@/lib/auction-engine";
import { DEFAULT_AUCTION_CONFIG, BidAction } from "@/lib/types";
import { TEAMS } from "@/data/team-config";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

interface AgentConfig {
  name: string;
  model: string;
}

const FALLBACK_AGENTS: AgentConfig[] = [
  { name: "Claude Sonnet 4", model: "anthropic/claude-sonnet-4" },
  { name: "GPT-4o", model: "openai/gpt-4o" },
  { name: "Gemini 2.5 Flash", model: "google/gemini-2.5-flash" },
  { name: "DeepSeek V3", model: "deepseek/deepseek-chat-v3-0324" },
];

const EXTERNAL_BID_TIMEOUT_MS = 120_000; // 2 minutes
const EXTERNAL_POLL_INTERVAL_MS = 2_000; // 2 seconds

// POST /api/v1/auctions/[id]/start — Start auction and run bidding loop in background
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: auctionId } = await params;

    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: { teams: { include: { agent: true } } },
    });

    if (!auction) return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    if (auction.status !== "LOBBY") return NextResponse.json({ error: "Auction not in LOBBY state" }, { status: 400 });
    if (auction.teams.length < 2) return NextResponse.json({ error: "Need at least 2 teams to start" }, { status: 400 });

    // Read model mapping from auction config (set by add-bots)
    const auctionConfig = JSON.parse(auction.config || "{}");
    const agentModels: { teamIndex: number; name: string; model: string }[] = auctionConfig.agentModels || [];
    const externalSlots: Record<string, { token: string }> = auctionConfig.externalSlots || {};

    // Map teams to agent configs
    const agentTeams = auction.teams.map((team) => {
      const isExternal = !!externalSlots[String(team.teamIndex)];
      const modelMapping = agentModels.find((m) => m.teamIndex === team.teamIndex);
      const agentConfig = modelMapping
        ? { name: modelMapping.name, model: modelMapping.model }
        : FALLBACK_AGENTS[team.teamIndex] || FALLBACK_AGENTS[0];
      return {
        teamId: team.id,
        teamIndex: team.teamIndex,
        agentId: team.agentId,
        config: agentConfig,
        isExternal,
      };
    });

    // Start the auction
    await startAuction(auctionId);
    console.log(`[Start] Auction ${auctionId} started!`);

    // Run bidding loop in background (fire and forget)
    runBiddingLoop(auctionId, agentTeams).catch((err) =>
      console.error(`[BiddingLoop] Fatal error:`, err)
    );

    return NextResponse.json({
      message: "Auction started! Bidding is now live.",
      status: "RUNNING",
    });
  } catch (error: any) {
    console.error("Start auction error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to start auction" },
      { status: 500 }
    );
  }
}

// Background bidding loop (supports Round 1 + Round 2 for unsold players)
async function runBiddingLoop(
  auctionId: string,
  agentTeams: { teamId: string; teamIndex: number; agentId: string; config: AgentConfig; isExternal: boolean }[]
) {
  const minSquad = DEFAULT_AUCTION_CONFIG.minSquadSize;

  for (let currentRound = 1; currentRound <= 2; currentRound++) {
    // ─── Round 2 setup: check if needed, re-queue unsold players ───
    if (currentRound === 2) {
      const teams = await prisma.auctionTeam.findMany({ where: { auctionId } });
      const incompleteTeams = teams.filter(t => t.squadSize < minSquad);

      if (incompleteTeams.length === 0) {
        console.log(`[Auction] All squads have ${minSquad}+ players. Skipping Round 2.`);
        break;
      }

      const unsoldLots = await prisma.lot.findMany({
        where: { auctionId, status: "UNSOLD" },
      });

      if (unsoldLots.length === 0) {
        console.log(`[Round 2] No unsold players to re-auction.`);
        break;
      }

      console.log(`[Round 2] ${incompleteTeams.length} team(s) incomplete. Re-auctioning ${unsoldLots.length} unsold players...`);

      // Reset unsold lots for fresh bidding
      for (const lot of unsoldLots) {
        await prisma.bid.deleteMany({ where: { lotId: lot.id } });
        await prisma.auctionPlayer.update({
          where: { id: lot.playerId },
          data: { isUnsold: false },
        });
        await prisma.lot.update({
          where: { id: lot.id },
          data: { status: "PENDING", startedAt: null, endedAt: null, finalPrice: null, winnerId: null },
        });
      }

      // Set auction back to RUNNING
      await prisma.auction.update({
        where: { id: auctionId },
        data: { status: "RUNNING", completedAt: null },
      });

      // Start first PENDING lot
      const firstPending = await prisma.lot.findFirst({
        where: { auctionId, status: "PENDING" },
        orderBy: { lotNumber: "asc" },
      });
      if (firstPending) {
        await prisma.lot.update({
          where: { id: firstPending.id },
          data: { status: "BIDDING", startedAt: new Date() },
        });
      }
    }

    console.log(`[Round ${currentRound}] Starting${currentRound === 2 ? " (unsold players)" : ""}...`);

    // ─── Main bidding loop for this round ───
    let isRunning = true;

    while (isRunning) {
      const auction = await prisma.auction.findUnique({
        where: { id: auctionId },
        include: {
          lots: {
            where: { status: "BIDDING" },
            include: { player: true },
          },
        },
      });

      if (!auction || auction.status === "COMPLETED" || auction.status === "STOPPED") {
        isRunning = false;
        break;
      }

      const currentLot = auction.lots[0];
      if (!currentLot) {
        isRunning = false;
        break;
      }

      console.log(`[R${currentRound} Lot ${currentLot.lotNumber}] ${currentLot.player.name} (${currentLot.player.role})`);

      let lotActive = true;
      let roundCount = 0;

      while (lotActive && roundCount < 50) {
        roundCount++;

        const nextBidderId = await getNextBidder(auctionId, currentLot.id);

        if (!nextBidderId) {
          const completion = await checkLotCompletion(auctionId, currentLot.id, DEFAULT_AUCTION_CONFIG);
          if (completion.completed) {
            console.log(`  -> ${completion.status}`);
            lotActive = false;
          }
          break;
        }

        const agentTeam = agentTeams.find((a) => a.teamId === nextBidderId);
        if (!agentTeam) break;

        let decision: BidAction;

        if (agentTeam.isExternal) {
          // ─── External agent: wait for bid via API ───
          console.log(`  [Waiting] External agent ${TEAMS[agentTeam.teamIndex].shortName} — turn to bid...`);

          const cfg = JSON.parse((await prisma.auction.findUnique({ where: { id: auctionId } }))?.config || "{}");
          cfg.pendingExternalBid = { teamId: agentTeam.teamId, lotId: currentLot.id };
          await prisma.auction.update({ where: { id: auctionId }, data: { config: JSON.stringify(cfg) } });

          decision = await waitForExternalBid(auctionId, agentTeam.teamId, currentLot.id);

          const cfg2 = JSON.parse((await prisma.auction.findUnique({ where: { id: auctionId } }))?.config || "{}");
          delete cfg2.pendingExternalBid;
          await prisma.auction.update({ where: { id: auctionId }, data: { config: JSON.stringify(cfg2) } });
        } else {
          // ─── Internal agent: call OpenRouter ───
          const state = await getAuctionState(auctionId, agentTeam.teamId);
          decision = await getAgentDecision(agentConfig(agentTeam), state, auctionId, agentTeam.teamId, currentRound);
        }

        const result = await processBid(auctionId, agentTeam.teamId, decision);

        if (result.success) {
          console.log(`  ${TEAMS[agentTeam.teamIndex].shortName}: ${decision.action}${result.newBidAmount ? ` ₹${result.newBidAmount}Cr` : ""}`);
        } else {
          console.log(`  ${TEAMS[agentTeam.teamIndex].shortName}: auto-pass (${result.message})`);
          await processBid(auctionId, agentTeam.teamId, { action: "pass", reasoning: `Auto-pass: ${result.message}` });
        }

        const completion = await checkLotCompletion(auctionId, currentLot.id, DEFAULT_AUCTION_CONFIG);
        if (completion.completed) {
          console.log(`  -> ${completion.status}`);
          lotActive = false;
        }
      }

      // Round 2 early exit: if all squads complete, end auction immediately
      if (currentRound === 2) {
        const allTeams = await prisma.auctionTeam.findMany({ where: { auctionId } });
        if (allTeams.every(t => t.squadSize >= minSquad)) {
          console.log(`[Round 2] All squads complete! Ending auction.`);
          await prisma.auction.update({
            where: { id: auctionId },
            data: { status: "COMPLETED", completedAt: new Date() },
          });
          isRunning = false;
        }
      }
    }
  }

  // Run evaluation
  console.log(`[Start] Auction complete, running evaluation...`);
  const { runFullEvaluation } = await import("@/lib/grading/scoring");
  await runFullEvaluation(auctionId);
  console.log(`[Start] Evaluation complete.`);
}

function agentConfig(at: { config: AgentConfig }) {
  return at.config;
}

// ─── Wait for external agent bid (polls DB) ─────────────────
async function waitForExternalBid(
  auctionId: string,
  teamId: string,
  lotId: string
): Promise<BidAction> {
  const startTime = Date.now();

  // Count existing bids from this team on this lot before we start waiting
  const existingBids = await prisma.bid.count({
    where: { lotId, teamId },
  });

  while (Date.now() - startTime < EXTERNAL_BID_TIMEOUT_MS) {
    // Check if auction was stopped
    const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
    if (auction?.status === "STOPPED") {
      return { action: "pass", reasoning: "Auction stopped" };
    }

    // Check for new bid from this team
    const currentBids = await prisma.bid.count({
      where: { lotId, teamId },
    });

    if (currentBids > existingBids) {
      // External agent submitted a bid — fetch it
      const latestBid = await prisma.bid.findFirst({
        where: { lotId, teamId },
        orderBy: { timestamp: "desc" },
      });

      if (latestBid) {
        return {
          action: latestBid.action as "bid" | "pass",
          amount: latestBid.amount || undefined,
          reasoning: latestBid.reasoning,
        };
      }
    }

    await new Promise((r) => setTimeout(r, EXTERNAL_POLL_INTERVAL_MS));
  }

  // Timeout — auto-pass
  console.log(`  [Timeout] External agent timed out, auto-passing`);
  return { action: "pass", reasoning: "External agent timed out (120s)" };
}

// ─── Build conversation history from past decisions ─────────
async function buildConversationHistory(
  auctionId: string,
  teamId: string
): Promise<{ role: string; content: string }[]> {
  // Fetch all past bids by this team, with lot & player info
  const pastBids = await prisma.bid.findMany({
    where: { teamId, lot: { auctionId } },
    include: {
      lot: {
        include: { player: true },
      },
    },
    orderBy: { timestamp: "asc" },
  });

  if (pastBids.length === 0) return [];

  // Group by lot to get the final decision per lot (only completed lots)
  const lotDecisions = new Map<string, typeof pastBids>();
  for (const bid of pastBids) {
    if (bid.lot.status !== "SOLD" && bid.lot.status !== "UNSOLD") continue;
    const existing = lotDecisions.get(bid.lotId) || [];
    existing.push(bid);
    lotDecisions.set(bid.lotId, existing);
  }

  const history: { role: string; content: string }[] = [];

  // Take last 10 lots to avoid blowing context
  const recentLots = [...lotDecisions.entries()].slice(-10);

  for (const [, bids] of recentLots) {
    const lot = bids[0].lot;
    const myLastBid = [...bids].reverse().find((b) => b.teamId === teamId);
    if (!myLastBid) continue;

    // Summarized user prompt (what was asked)
    history.push({
      role: "user",
      content: `LOT #${lot.lotNumber}: ${lot.player.name} (${lot.player.role}, ${lot.player.nationality}) — Base ₹${lot.player.basePrice} Cr. Outcome: ${lot.status}${lot.finalPrice ? ` at ₹${lot.finalPrice} Cr` : ""}.`,
    });

    // What the agent decided
    const action = myLastBid.action.toUpperCase();
    history.push({
      role: "assistant",
      content: `ACTION: ${action}\nREASONING: ${myLastBid.reasoning}`,
    });
  }

  return history;
}

async function getAgentDecision(
  agentConfig: AgentConfig,
  state: any,
  auctionId: string,
  teamId: string,
  currentRound: number = 1
): Promise<BidAction> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { action: "pass", reasoning: "No API key configured" };

  if (!state.currentLot) return { action: "pass", reasoning: "No active lot" };

  const lot = state.currentLot;
  const team = state.yourTeam;

  const minSquad = DEFAULT_AUCTION_CONFIG.minSquadSize;
  const maxSquad = DEFAULT_AUCTION_CONFIG.maxSquadSize;
  const slotsNeeded = Math.max(0, minSquad - team.squadSize);
  const lotsLeft = state.auctionProgress.lotsRemaining;
  const urgencyRatio = slotsNeeded > 0 ? lotsLeft / slotsNeeded : 999;
  const isCritical = urgencyRatio <= 2.0 && slotsNeeded > 0;
  const isMustBuy = urgencyRatio <= 1.2 && slotsNeeded > 0;

  const totalPoolSize = state.auctionProgress.lotsCompleted + state.auctionProgress.lotsRemaining;

  // Pacing check: is this team buying at a reasonable rate?
  // Don't check pacing until at least 20% of lots are done — early lots are normal
  const auctionProgress = state.auctionProgress.lotsCompleted / totalPoolSize;
  const expectedPlayersByNow = Math.max(1, Math.round(auctionProgress * minSquad));
  const isBehindPace = auctionProgress >= 0.2 && team.squadSize < expectedPlayersByNow * 0.5 && slotsNeeded > 3;
  const avgBudgetPerPlayer = team.purseRemaining / Math.max(1, slotsNeeded > 0 ? slotsNeeded : 3);

  // Current bid info for decision context
  const currentBidAmount = state.currentBid?.amount || state.currentLot?.basePrice || 0;

  const systemPrompt = `You are an AI agent competing in a cricket player auction (Blitz Premier League).
You are managing ${TEAMS[team.teamIndex]?.name || "a franchise"} with a ₹100 Cr purse.

═══ IPL AUCTION RULES ═══
- Base prices range from ₹0.20 Cr to ₹2.00 Cr (maximum base price is ₹2 Cr).
- You only decide BID or PASS. The bid amount is determined by auction rules:
  • Opening bid = base price
  • Each subsequent bid goes up by a fixed increment (₹0.20-1.00 Cr depending on price level)
- You CANNOT choose a custom bid amount. Just decide: bid or pass.
- If you bid, you match the current asking price. If all others pass, you win the player.

═══ POOL SIZE: ${totalPoolSize} TOTAL PLAYERS ═══
The auction has ${totalPoolSize} players total. You need ${minSquad} minimum from this pool.
4 teams are competing for the same players — you will NOT get every player you bid on.
MANY good players come in later lots. Do NOT blow your budget on early lots.

═══ BUDGET MATH (READ THIS!) ═══
₹100 Cr ÷ ${minSquad} players = ₹${(100 / minSquad).toFixed(1)} Cr average per player.
- PREMIUM picks (₹8+ Cr): MAX 2-3 for the entire auction. These are true stars only.
- SOLID picks (₹4-7 Cr): Your core 5-7 players.
- VALUE picks (₹1-3 Cr): Fill remaining slots. Many good players go near base price.
- If you spend ₹12 Cr on one player, that's budget for 3-4 solid players GONE.
${avgBudgetPerPlayer < 3 ? "🚨 YOUR AVERAGE BUDGET PER REMAINING SLOT IS ONLY ₹" + avgBudgetPerPlayer.toFixed(1) + " Cr — YOU ARE OVERSPENDING!" : ""}

═══ OBJECTIVES (ranked by priority) ═══
1. BUILD A COMPLETE SQUAD: Minimum ${minSquad} players. Under ${minSquad} = ZERO score. Non-negotiable.
2. MEET ROLE REQUIREMENTS: Min 5 batsmen, 5 bowlers, 3 all-rounders, 2 wicket-keepers.
3. MAXIMIZE SQUAD QUALITY: Higher-impact players win more matches in the season simulation.
4. BUDGET EFFICIENCY: Underpaying for quality is rewarded. Overpaying is penalized.

═══ HARD CONSTRAINTS ═══
- Squad: ${minSquad}–${maxSquad} players (below ${minSquad} = disqualified, above ${maxSquad} = cannot buy)
- Overseas: Max 8 (nationality ≠ India)
- Budget: ₹100 Cr total. You cannot go negative.
- Reserve Rule: Always keep ₹0.5 Cr × remaining_slots_to_${minSquad} in reserve.

═══ HOW YOU ARE SCORED (10 graders) ═══
1. Budget Efficiency — Did you use your purse wisely? (not hoarding, not overspending)
2. Valuation Accuracy — Did you pay close to a player's TRUE hidden value?
3. Squad Balance — Are all 4 roles adequately filled?
4. Overseas Optimization — Are your overseas picks high-impact?
5. Overbid Penalty — Heavy penalty for paying >> true value (watch for inflated visible stats)
6. Pass Discipline — Did you wisely skip overpriced/trap players?
7. Constraint Compliance — Squad size, overseas cap, purse compliance
8. Purse Management — Smooth spending curve, not front-loaded or panic buys
9. Trap Resistance — Did you avoid trap players (inflated stats, low true value)?
10. Value Discovery — Did you find sleeper picks (low visible stats, high true value)?

═══ PLAYER ASSESSMENT FRAMEWORK ═══
BATSMEN: Look at batting avg (>30 is good), strike rate (>135 elite), recent form, hundreds/fifties count
BOWLERS: Economy (<7.5 elite), wickets tally, bowling average, recent form wickets/match
ALL-ROUNDERS: Dual contribution — both batting AND bowling stats must be decent
WICKET-KEEPERS: Batting avg + strike rate matter most (keeping is assumed)

⚠️ TRAPS TO WATCH:
- Players with great career stats but POOR recent form → might be declining
- Very high base price with moderate stats → overvalued
- Batsmen with high average but LOW strike rate → anchors, less T20 impact
- Bowlers with low economy but very few matches → small sample size

═══ ROUND SYSTEM ═══
- ROUND 1: All ${totalPoolSize} players auctioned. You MUST buy most of your squad in Round 1.
- ROUND 2 (backup only): If any team has < ${minSquad} after Round 1, unsold players are re-auctioned.
- Round 2 is a LAST RESORT — do NOT rely on it. Most good players sell in Round 1 and won't return.
- You MUST actively buy players throughout Round 1. Waiting for Round 2 = guaranteed failure.
${currentRound === 2 ? "🔄 ROUND 2: Fill your squad NOW with these remaining players!" : ""}

═══ STRATEGIC PHASES ═══
- Lots 1–35 (Early): Be selective. Let bidding wars run — pass when price exceeds ₹6-7 Cr.
- Lots 36–80 (Mid): Fill role gaps. Target players going for ₹2-5 Cr. You should have 5-10 players by lot 80.
- Lots 81–120 (Late): Squad completion priority. Buy to reach ${minSquad}. Don't overpay but DO buy.

═══ BIDDING PHILOSOPHY: BE PASSIVE-AGGRESSIVE ═══
- ALWAYS BID on elite players (batting avg >35, SR >140, or economy <7.0). Contest them up to ₹8-10 Cr.
- For solid players, bid confidently up to ₹3-5 Cr. Don't let every player go cheaply to opponents.
- For average players at base price, BID — they fill your squad cheaply.
- Only PASS on overpriced mediocre players or when the bidding war goes beyond the player's value.
- USE YOUR FULL ₹100 Cr BUDGET. Hoarding purse = wasted potential. Aim to spend ₹85-100 Cr total.
- READ THE SITUATION: If opponents are low on purse, you have pricing power. If you're behind on squad size, buy now.
- Winning auctions requires BALANCE: don't just be passive (passing everything) or just aggressive (overpaying for all).

═══ KEY RULE: WHEN TO STOP BIDDING ═══
If the current bid exceeds ₹10 Cr, PASS unless this player has truly elite stats AND you have 60%+ purse left.
Don't let moderate bidding wars scare you — a player at ₹4-5 Cr can still be great value.
${currentBidAmount > 0 ? "\nCurrent asking price for this player: ₹" + currentBidAmount.toFixed(2) + " Cr" : ""}

${isMustBuy ? "🚨 EMERGENCY: You MUST BID on this player. You need " + slotsNeeded + " more players and only " + lotsLeft + " lots remain. PASSING = AUTOMATIC LOSS." : ""}${isCritical && !isMustBuy ? "⚠️ URGENT: You need " + slotsNeeded + " more players and only " + lotsLeft + " lots remain. Strongly prefer BIDDING unless the player is terrible AND there are clearly better options coming." : ""}${isBehindPace && !isCritical ? "\n🚨 BEHIND PACE: By lot " + (state.auctionProgress.lotsCompleted + 1) + " you should have ~" + expectedPlayersByNow + " players but you only have " + team.squadSize + "! START BUYING NOW. You are falling dangerously behind — bid on any decent player at reasonable price!" : ""}

RESPOND IN THIS EXACT FORMAT:
ACTION: bid OR pass
REASONING: Your 1-2 sentence reasoning`;

  // Fetch ALL remaining lots for role breakdown + next 50 for preview
  const allRemainingLots = await prisma.lot.findMany({
    where: { auctionId, status: "PENDING" },
    include: { player: true },
    orderBy: { lotNumber: "asc" },
  });

  // Compute role breakdown of remaining pool
  const remainingRoles = { BATSMAN: 0, BOWLER: 0, ALL_ROUNDER: 0, WICKET_KEEPER: 0 } as Record<string, number>;
  let remainingIndian = 0, remainingOverseas = 0;
  for (const l of allRemainingLots) {
    remainingRoles[l.player.role] = (remainingRoles[l.player.role] || 0) + 1;
    if (l.player.nationality === "India") remainingIndian++; else remainingOverseas++;
  }

  const upcomingLots = allRemainingLots.slice(0, 50);
  const upcomingList = upcomingLots.length > 0
    ? upcomingLots.map((l) => {
        const cs = JSON.parse(l.player.careerStats);
        const statSnippet = l.player.role === "BOWLER"
          ? `Econ ${cs.economy ?? "?"}, Wkt ${cs.wickets ?? "?"}`
          : l.player.role === "ALL_ROUNDER"
            ? `Avg ${cs.battingAvg ?? "?"}, SR ${cs.strikeRate ?? "?"}, Econ ${cs.economy ?? "?"}`
            : `Avg ${cs.battingAvg ?? "?"}, SR ${cs.strikeRate ?? "?"}`;
        return `  #${l.lotNumber} ${l.player.name} (${l.player.role}, ${l.player.nationality}) Base ₹${l.player.basePrice}Cr — ${statSnippet}`;
      }).join("\n")
    : "  None — this is the last lot!";

  const reserveNeeded = Math.max(0, slotsNeeded * 0.5);
  const effectivePurse = team.purseRemaining - reserveNeeded;

  const cs = lot.careerStats;
  const rf = lot.recentForm;
  // Build readable stat lines instead of raw JSON
  const batLine = cs.battingAvg ? `Avg: ${cs.battingAvg} | SR: ${cs.strikeRate || "?"} | Matches: ${cs.matches || "?"} | 100s: ${cs.hundreds || 0} | 50s: ${cs.fifties || 0}` : "N/A (not a primary batsman)";
  const bowlLine = cs.economy ? `Econ: ${cs.economy} | Wickets: ${cs.wickets || "?"} | Bowl Avg: ${cs.bowlingAvg || "?"} | Matches: ${cs.matches || "?"}` : "N/A (not a bowler)";
  const formLine = rf ? `Last 5 matches — Runs: ${rf.runs ?? "?"}, Avg: ${rf.recentAvg ?? "?"}, SR: ${rf.recentSR ?? "?"}, Wkts: ${rf.wickets ?? "?"}, Econ: ${rf.recentEcon ?? "?"}` : "No recent form data";

  // Next bid amount if agent decides to bid (per IPL increment rules)
  const nextBidAmount = state.currentBid
    ? Math.round((state.currentBid.amount + getNextIncrement(state.currentBid.amount)) * 10) / 10
    : lot.basePrice;

  const userPrompt = `${currentRound === 2 ? "═══ ROUND 2 (Re-Auction of Unsold Players) ═══\n" : ""}═══ LOT #${lot.lotNumber} / ${state.auctionProgress.lotsCompleted + state.auctionProgress.lotsRemaining} ═══
PLAYER: ${lot.name}
Role: ${lot.role} → ${lot.subType} | Age: ${lot.age} | ${lot.nationality}
Base Price: ₹${lot.basePrice} Cr
Style: ${lot.styleTags.join(", ")}

BATTING: ${batLine}
BOWLING: ${bowlLine}
RECENT FORM: ${formLine}

CURRENT BID: ${state.currentBid ? `₹${state.currentBid.amount} Cr (by another team)` : `No bids yet — opens at ₹${lot.basePrice} Cr`}
${state.currentBid ? `IF YOU BID: You will bid ₹${nextBidAmount} Cr (fixed increment per IPL rules)` : `IF YOU BID: Opening bid at ₹${lot.basePrice} Cr (base price)`}

═══ YOUR TEAM: ${TEAMS[team.teamIndex]?.shortName || "?"} ═══
Purse: ₹${team.purseRemaining.toFixed(1)} Cr remaining (reserve ₹${reserveNeeded.toFixed(1)} for remaining slots → ₹${effectivePurse.toFixed(1)} effectively available)
Squad: ${team.squadSize}/${maxSquad} players | Overseas: ${team.overseasCount}/8${lot.nationality !== "India" && team.overseasCount >= 8 ? " ⛔ OVERSEAS CAP REACHED" : ""}
Roles filled: ${team.roleCounts.BATSMAN} BAT, ${team.roleCounts.BOWLER} BOWL, ${team.roleCounts.ALL_ROUNDER} AR, ${team.roleCounts.WICKET_KEEPER} WK
Still need: ${team.needs.batsmenNeeded > 0 ? team.needs.batsmenNeeded + " BAT, " : ""}${team.needs.bowlersNeeded > 0 ? team.needs.bowlersNeeded + " BOWL, " : ""}${team.needs.allRoundersNeeded > 0 ? team.needs.allRoundersNeeded + " AR, " : ""}${team.needs.keepersNeeded > 0 ? team.needs.keepersNeeded + " WK, " : ""}${slotsNeeded > 0 ? slotsNeeded + " total to reach " + minSquad : "minimum met ✅"}

═══ OPPONENTS ═══
${state.otherTeams.map((t: any) => `  ${TEAMS[t.teamIndex]?.shortName || "Team " + t.teamIndex}: ₹${t.purseRemaining.toFixed(1)} Cr | ${t.squadSize} players | ${t.overseasCount} overseas`).join("\n")}

═══ REMAINING POOL (${allRemainingLots.length} players left) ═══
Roles coming up: ${remainingRoles.BATSMAN || 0} BAT, ${remainingRoles.BOWLER || 0} BOWL, ${remainingRoles.ALL_ROUNDER || 0} AR, ${remainingRoles.WICKET_KEEPER || 0} WK
Indian: ${remainingIndian} | Overseas: ${remainingOverseas}
→ There are PLENTY of each role still available. Don't panic-buy!

═══ NEXT ${upcomingLots.length} PLAYERS ═══
${upcomingList}

═══ AUCTION PROGRESS ═══
${state.auctionProgress.lotsCompleted} of ${totalPoolSize} done, ${state.auctionProgress.lotsRemaining} remaining
${slotsNeeded > 0 ? `⚠️ YOU NEED ${slotsNeeded} MORE PLAYERS. ${urgencyRatio < 1.5 ? "THIS IS CRITICAL — BID NOW!" : urgencyRatio < 3 ? "Getting urgent — prioritize filling slots." : "Plan ahead to fill your roster."}` : "✅ Squad minimum met — focus on quality upgrades only."}
${lot.nationality !== "India" && team.overseasCount >= 8 ? "⛔ You CANNOT buy this player — overseas cap reached. PASS." : ""}
${isMustBuy ? "🚨🚨 MUST-BUY: " + slotsNeeded + " slots needed, " + lotsLeft + " lots left. YOU MUST BID OR YOU LOSE. 🚨🚨" : ""}

Should you BID or PASS?`;

  try {
    // Build conversation history from past decisions
    const history = await buildConversationHistory(auctionId, teamId);

    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: userPrompt },
    ];

    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: agentConfig.model,
        messages,
        max_tokens: 400,
        temperature: 0.3,
      }),
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";

    const actionMatch = content.match(/ACTION:\s*(bid|pass)/i);
    const reasoningMatch = content.match(/REASONING:\s*(.+?)(?:\n|$)/i);

    const action = actionMatch?.[1]?.toLowerCase() === "bid" ? "bid" : "pass";
    const reasoning = reasoningMatch?.[1]?.trim() || content.slice(0, 200);

    // Force-bid override: if agent needs players and lots are running out, don't let it pass
    // BUT don't force at absurd prices — cap force-override at ₹15 Cr
    if (action === "pass" && isMustBuy) {
      const nextPrice = state.currentBid
        ? Math.round((state.currentBid.amount + getNextIncrement(state.currentBid.amount)) * 10) / 10
        : state.currentLot.basePrice;
      if (nextPrice <= 15) {
        console.log(`  [Override] Forcing bid at ₹${nextPrice} Cr — need ${slotsNeeded} players, only ${lotsLeft} lots left`);
        return { action: "bid", reasoning: `Forced bid: need ${slotsNeeded} more players, ${lotsLeft} lots remaining` };
      }
      // Above ₹15 Cr, respect agent's pass decision even in must-buy
      console.log(`  [Override skipped] Price ₹${nextPrice} Cr too high for force-bid, respecting agent's pass`);
    }

    // Force-bid for behind-pace teams (earlier intervention than must-buy)
    if (action === "pass" && isBehindPace && !isMustBuy) {
      const pacingPrice = state.currentBid
        ? Math.round((state.currentBid.amount + getNextIncrement(state.currentBid.amount)) * 10) / 10
        : state.currentLot.basePrice;
      if (pacingPrice <= 8) {
        console.log(`  [Override] Behind pace — forcing bid at ₹${pacingPrice} Cr (need ${slotsNeeded} players, have ${team.squadSize})`);
        return { action: "bid", reasoning: `Forced bid: severely behind buying pace (${team.squadSize} players, need ${slotsNeeded} more)` };
      }
    }

    if (action === "pass") return { action: "pass", reasoning };

    // Agent chose to bid — engine handles the amount (base price or current + increment)
    return { action: "bid", reasoning };
  } catch (error) {
    console.error(`[Agent ${agentConfig.name}] Error:`, error);
    return { action: "pass", reasoning: "LLM call failed" };
  }
}

/** Get the next bid increment based on current price (mirrors DEFAULT_AUCTION_CONFIG) */
function getNextIncrement(currentBid: number): number {
  if (currentBid < 2) return 0.20;
  if (currentBid < 5) return 0.25;
  if (currentBid < 10) return 0.50;
  return 1.00;
}
