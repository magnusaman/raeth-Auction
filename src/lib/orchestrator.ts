import { prisma } from "./db";
import {
  createAuction,
  joinAuction,
  startAuction,
  getAuctionState,
  processBid,
  getNextBidder,
  checkLotCompletion,
} from "./auction-engine";
import { runFullEvaluation } from "./grading/scoring";
import { DEFAULT_AUCTION_CONFIG, AuctionStateForAgent, BidAction } from "./types";
import { TEAMS } from "@/data/team-config";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

interface AgentConfig {
  name: string;
  model: string; // OpenRouter model ID
  systemPrompt?: string;
}

const DEFAULT_AGENTS: AgentConfig[] = [
  { name: "Claude-Strategist", model: "anthropic/claude-sonnet-4.6" },
  { name: "GPT-Analyst", model: "openai/gpt-5.4" },
  { name: "Gemini-Tactician", model: "google/gemini-3.1-pro-preview" },
  { name: "DeepSeek-Aggressor", model: "deepseek/deepseek-v3.2" },
];

// ─── Run Full Auction ────────────────────────────────────────

export async function runFullAuction(
  agents?: AgentConfig[]
): Promise<{ auctionId: string; results: any }> {
  const agentConfigs = agents || DEFAULT_AGENTS;

  // 1. Create auction
  const auctionId = await createAuction();
  console.log(`[Orchestrator] Auction created: ${auctionId}`);

  // 2. Register agents and join
  const agentTeams: { agentId: string; teamId: string; teamIndex: number; config: AgentConfig }[] = [];

  for (let i = 0; i < 4; i++) {
    const config = agentConfigs[i];

    // Check if agent exists, if not create
    let agent = await prisma.agent.findUnique({ where: { name: config.name } });
    if (!agent) {
      agent = await prisma.agent.create({
        data: {
          name: config.name,
          description: `AI agent using ${config.model}`,
          apiKey: `ab_auto_${Date.now()}_${i}`,
        },
      });
    }

    const { teamId, teamIndex } = await joinAuction(auctionId, agent.id, i);
    agentTeams.push({ agentId: agent.id, teamId, teamIndex, config });
    console.log(`[Orchestrator] ${config.name} joined as ${TEAMS[teamIndex].name}`);
  }

  // 3. Start auction
  await startAuction(auctionId);
  console.log(`[Orchestrator] Auction started!`);

  // 4. Run auction loop (supports Round 1 + Round 2 for unsold players)
  const minSquad = DEFAULT_AUCTION_CONFIG.minSquadSize;
  let lotCount = 0;

  for (let currentRound = 1; currentRound <= 2; currentRound++) {
    // ─── Round 2 setup: check if needed, re-queue unsold players ───
    if (currentRound === 2) {
      const teams = await prisma.auctionTeam.findMany({ where: { auctionId } });
      const incompleteTeams = teams.filter(t => t.squadSize < minSquad);

      if (incompleteTeams.length === 0) {
        console.log(`[Orchestrator] All squads have ${minSquad}+ players. Skipping Round 2.`);
        break;
      }

      const unsoldLots = await prisma.lot.findMany({
        where: { auctionId, status: "UNSOLD" },
      });

      if (unsoldLots.length === 0) {
        console.log(`[Orchestrator] No unsold players to re-auction.`);
        break;
      }

      console.log(`[Round 2] ${incompleteTeams.length} team(s) incomplete. Re-auctioning ${unsoldLots.length} unsold players...`);

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

      await prisma.auction.update({
        where: { id: auctionId },
        data: { status: "RUNNING", completedAt: null },
      });

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

      if (!auction || auction.status === "COMPLETED") {
        isRunning = false;
        break;
      }

      const currentLot = auction.lots[0];
      if (!currentLot) {
        isRunning = false;
        break;
      }

      lotCount++;
      console.log(`[R${currentRound} Lot ${currentLot.lotNumber}] ${currentLot.player.name} (${currentLot.player.role})`);

      let lotActive = true;
      let roundCount = 0;
      const MAX_ROUNDS = 50;

      while (lotActive && roundCount < MAX_ROUNDS) {
        roundCount++;

        const nextBidderId = await getNextBidder(auctionId, currentLot.id);

        if (!nextBidderId) {
          const config = DEFAULT_AUCTION_CONFIG;
          const completion = await checkLotCompletion(auctionId, currentLot.id, config);
          if (completion.completed) {
            console.log(`[Orchestrator] Lot ${currentLot.lotNumber}: ${completion.status}`);
            lotActive = false;
          }
          break;
        }

        const agentTeam = agentTeams.find((a) => a.teamId === nextBidderId);
        if (!agentTeam) break;

        const state = await getAuctionState(auctionId, agentTeam.teamId);
        const decision = await getAgentDecision(agentTeam.config, state, currentRound);

        const result = await processBid(auctionId, agentTeam.teamId, decision);

        if (result.success) {
          console.log(
            `  ${TEAMS[agentTeam.teamIndex].shortName}: ${decision.action}${result.newBidAmount ? ` ₹${result.newBidAmount}Cr` : ""}`
          );
        } else {
          console.log(`  ${TEAMS[agentTeam.teamIndex].shortName}: auto-pass (${result.message})`);
          await processBid(auctionId, agentTeam.teamId, { action: "pass", reasoning: `Auto-pass: ${result.message}` });
        }

        const completion = await checkLotCompletion(auctionId, currentLot.id, DEFAULT_AUCTION_CONFIG);
        if (completion.completed) {
          console.log(`[Orchestrator] Lot ${currentLot.lotNumber}: ${completion.status}`);
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

  console.log(`[Orchestrator] Auction complete! ${lotCount} lots processed.`);

  // 5. Run evaluation
  console.log(`[Orchestrator] Running evaluation...`);
  const results = await runFullEvaluation(auctionId);
  console.log(`[Orchestrator] Winner: ${results.winner.agentName} (score: ${results.winner.score})`);

  return { auctionId, results };
}

// ─── Get Agent Decision from LLM ────────────────────────────

async function getAgentDecision(
  agentConfig: AgentConfig,
  state: AuctionStateForAgent,
  currentRound: number = 1
): Promise<BidAction> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { action: "pass", reasoning: "No API key configured" };
  }

  const systemPrompt = agentConfig.systemPrompt || buildSystemPrompt(state, currentRound);
  const userPrompt = buildStatePrompt(state, currentRound);

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: agentConfig.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 400,
        temperature: 0.3,
      }),
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";

    return parseDecision(content, state);
  } catch (error) {
    console.error(`[Agent ${agentConfig.name}] Error:`, error);
    return { action: "pass", reasoning: "LLM call failed" };
  }
}

function buildSystemPrompt(state: AuctionStateForAgent, currentRound: number = 1): string {
  const team = state.yourTeam;
  const minSquad = 15;
  const maxSquad = 20;
  const slotsNeeded = Math.max(0, minSquad - team.squadSize);
  const lotsLeft = state.auctionProgress.lotsRemaining;
  const urgencyRatio = slotsNeeded > 0 ? lotsLeft / slotsNeeded : 999;
  const isCritical = urgencyRatio <= 2.0 && slotsNeeded > 0;
  const isMustBuy = urgencyRatio <= 1.2 && slotsNeeded > 0;

  const teamAlias = TEAMS[team.teamIndex]?.promptAlias || "a franchise";

  const totalPoolSize = state.auctionProgress.lotsCompleted + lotsLeft;

  // Pacing check: is this team buying at a reasonable rate?
  // Don't check pacing until at least 20% of lots are done — early lots are normal
  const auctionProgressRatio = state.auctionProgress.lotsCompleted / totalPoolSize;
  const expectedPlayersByNow = Math.max(1, Math.round(auctionProgressRatio * minSquad));
  const isBehindPace = auctionProgressRatio >= 0.2 && team.squadSize < expectedPlayersByNow * 0.5 && slotsNeeded > 3;
  const avgBudgetPerPlayer = team.purseRemaining / Math.max(1, slotsNeeded > 0 ? slotsNeeded : 3);

  // Current bid info for decision context
  const currentBid = state.currentLot
    ? (state.currentBid?.amount || state.currentLot.basePrice)
    : 0;

  return `You are an AI agent competing in a cricket player auction (Blitz Premier League).
You are managing ${teamAlias} with a ₹100 Cr purse.

⚠️ IMPORTANT: Base your decisions ONLY on the player statistics provided below.
Do NOT use any external knowledge about real-world players, teams, or leagues.
Player IDs are anonymized. Judge each player purely on the numbers given.

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
${currentBid > 0 ? "\nCurrent asking price for this player: ₹" + currentBid.toFixed(2) + " Cr" : ""}

${isMustBuy ? "🚨 EMERGENCY: You MUST BID on this player. You need " + slotsNeeded + " more players and only " + lotsLeft + " lots remain. PASSING = AUTOMATIC LOSS." : ""}${isCritical && !isMustBuy ? "⚠️ URGENT: You need " + slotsNeeded + " more players and only " + lotsLeft + " lots remain. Strongly prefer BIDDING unless the player is terrible AND there are clearly better options coming." : ""}${isBehindPace && !isCritical ? "\n🚨 BEHIND PACE: By lot " + (state.auctionProgress.lotsCompleted + 1) + " you should have ~" + expectedPlayersByNow + " players but you only have " + team.squadSize + "! START BUYING NOW. You are falling dangerously behind — bid on any decent player at reasonable price!" : ""}

RESPOND IN THIS EXACT FORMAT:
ACTION: bid OR pass
REASONING: Your 1-2 sentence reasoning`;
}

/** Perturb a numeric stat by 1.1x to prevent fingerprinting against real data */
function p(val: number | undefined | null): string {
  if (val === undefined || val === null) return "?";
  return (Math.round(val * 1.1 * 100) / 100).toString();
}

/** Get the next bid increment based on current price (mirrors DEFAULT_AUCTION_CONFIG) */
function getNextIncrement(currentBid: number): number {
  if (currentBid < 2) return 0.20;
  if (currentBid < 5) return 0.25;
  if (currentBid < 10) return 0.50;
  return 1.00;
}

function buildStatePrompt(state: AuctionStateForAgent, currentRound: number = 1): string {
  if (!state.currentLot) {
    return "No active lot. Pass.";
  }

  const lot = state.currentLot;
  const team = state.yourTeam;
  const needs = team.needs;
  const minSquad = 15;
  const maxSquad = 20;
  const slotsNeeded = Math.max(0, minSquad - team.squadSize);
  const lotsLeft = state.auctionProgress.lotsRemaining;
  const urgencyRatio = slotsNeeded > 0 ? lotsLeft / slotsNeeded : 999;
  const isMustBuy = urgencyRatio <= 1.2 && slotsNeeded > 0;
  const reserveNeeded = Math.max(0, slotsNeeded * 0.5);
  const effectivePurse = team.purseRemaining - reserveNeeded;

  // Anonymized player ID — LLM never sees real name
  const anonId = `PLAYER_${String(lot.lotNumber).padStart(3, "0")}`;

  // Perturb stats x1.1 to prevent stat-fingerprinting
  const cs = lot.careerStats as any;
  const rf = lot.recentForm as any;
  const batLine = cs?.battingAvg ? `Avg: ${p(cs.battingAvg)} | SR: ${p(cs.strikeRate)} | Matches: ${p(cs.matches)} | 100s: ${p(cs.hundreds)} | 50s: ${p(cs.fifties)}` : "N/A (not a primary batsman)";
  const bowlLine = cs?.economy ? `Econ: ${p(cs.economy)} | Wickets: ${p(cs.wickets)} | Bowl Avg: ${p(cs.bowlingAvg)} | Matches: ${p(cs.matches)}` : "N/A (not a bowler)";

  // Recent form with perturbed stats
  const formLines = Array.isArray(rf) && rf.length > 0
    ? rf.map((s: any, i: number) => `  Season ${i + 1}: ${p(s.matches)} matches, Runs: ${p(s.runs)}, Avg: ${p(s.avg)}, SR: ${p(s.sr)}, Wkts: ${p(s.wickets)}, Econ: ${p(s.economy)}`).join("\n")
    : "  No recent form data";

  // Team aliases for LLM
  const teamAlias = TEAMS[team.teamIndex]?.promptShort || "?";

  // Next bid amount if agent decides to bid
  const nextBidAmount = state.currentBid
    ? Math.round((state.currentBid.amount + getNextIncrement(state.currentBid.amount)) * 10) / 10
    : lot.basePrice;

  return `${currentRound === 2 ? "═══ ROUND 2 (Re-Auction of Unsold Players) ═══\n" : ""}═══ LOT #${lot.lotNumber} / ${state.auctionProgress.lotsCompleted + lotsLeft} ═══
PLAYER: ${anonId}
Role: ${lot.role} → ${lot.subType} | Age: ${lot.age} | ${lot.nationality}
Base Price: ₹${lot.basePrice} Cr
Style: ${lot.styleTags.join(", ")}

BATTING: ${batLine}
BOWLING: ${bowlLine}
RECENT FORM:
${formLines}

CURRENT BID: ${state.currentBid ? `₹${state.currentBid.amount} Cr (by another team)` : `No bids yet — opens at ₹${lot.basePrice} Cr`}
${state.currentBid ? `IF YOU BID: You will bid ₹${nextBidAmount} Cr (fixed increment per IPL rules)` : `IF YOU BID: Opening bid at ₹${lot.basePrice} Cr (base price)`}

═══ YOUR TEAM: ${teamAlias} ═══
Purse: ₹${team.purseRemaining.toFixed(1)} Cr remaining (reserve ₹${reserveNeeded.toFixed(1)} for remaining slots → ₹${effectivePurse.toFixed(1)} effectively available)
Squad: ${team.squadSize}/${maxSquad} players | Overseas: ${team.overseasCount}/8${lot.nationality !== "India" && team.overseasCount >= 8 ? " ⛔ OVERSEAS CAP REACHED" : ""}
Roles filled: ${team.roleCounts.BATSMAN} BAT, ${team.roleCounts.BOWLER} BOWL, ${team.roleCounts.ALL_ROUNDER} AR, ${team.roleCounts.WICKET_KEEPER} WK
Still need: ${needs.batsmenNeeded > 0 ? needs.batsmenNeeded + " BAT, " : ""}${needs.bowlersNeeded > 0 ? needs.bowlersNeeded + " BOWL, " : ""}${needs.allRoundersNeeded > 0 ? needs.allRoundersNeeded + " AR, " : ""}${needs.keepersNeeded > 0 ? needs.keepersNeeded + " WK, " : ""}${slotsNeeded > 0 ? slotsNeeded + " total to reach " + minSquad : "minimum met ✅"}

═══ OPPONENTS ═══
${state.otherTeams.map((t) => `  ${TEAMS[t.teamIndex]?.promptShort || "Team " + t.teamIndex}: ₹${t.purseRemaining.toFixed(1)} Cr | ${t.squadSize} players | ${t.overseasCount} overseas`).join("\n")}

═══ AUCTION PROGRESS ═══
${state.auctionProgress.lotsCompleted} done, ${lotsLeft} remaining
${slotsNeeded > 0 ? `⚠️ YOU NEED ${slotsNeeded} MORE PLAYERS. ${urgencyRatio < 1.5 ? "THIS IS CRITICAL — BID NOW!" : urgencyRatio < 3 ? "Getting urgent — prioritize filling slots." : "Plan ahead to fill your roster."}` : "✅ Squad minimum met — focus on quality upgrades only."}
${lot.nationality !== "India" && team.overseasCount >= 8 ? "⛔ You CANNOT buy this player — overseas cap reached. PASS." : ""}
${isMustBuy ? "🚨🚨 MUST-BUY: " + slotsNeeded + " slots needed, " + lotsLeft + " lots left. YOU MUST BID OR YOU LOSE. 🚨🚨" : ""}

Should you BID or PASS?`;
}

function parseDecision(content: string, state: AuctionStateForAgent): BidAction {
  const actionMatch = content.match(/ACTION:\s*(bid|pass)/i);
  const reasoningMatch = content.match(/REASONING:\s*(.+?)(?:\n|$)/i);

  const action = actionMatch?.[1]?.toLowerCase() === "bid" ? "bid" : "pass";
  const reasoning = reasoningMatch?.[1]?.trim() || content.slice(0, 200);

  // Urgency override: force bid when squad is critically short
  const team = state.yourTeam;
  const minSquad = 15;
  const slotsNeeded = Math.max(0, minSquad - team.squadSize);
  const lotsLeft = state.auctionProgress.lotsRemaining;
  const urgencyRatio = slotsNeeded > 0 ? lotsLeft / slotsNeeded : 999;
  const isMustBuy = urgencyRatio <= 1.2 && slotsNeeded > 0;

  if (action === "pass" && isMustBuy) {
    // Force bid — but not at absurd prices (cap force-override at ₹15 Cr)
    const nextPrice = state.currentBid
      ? Math.round((state.currentBid.amount + getNextIncrement(state.currentBid.amount)) * 10) / 10
      : (state.currentLot?.basePrice || 0.5);
    if (nextPrice <= 15) {
      return { action: "bid", reasoning: `Forced bid: need ${slotsNeeded} more players, ${lotsLeft} lots remaining` };
    }
    // Above ₹15 Cr, respect agent's pass even in must-buy
  }

  // Force-bid for behind-pace teams (earlier intervention than must-buy)
  // Don't check pacing until at least 20% of lots are done
  const totalPool = state.auctionProgress.lotsCompleted + lotsLeft;
  const progressRatio = state.auctionProgress.lotsCompleted / totalPool;
  const expectedByNow = Math.max(1, Math.round(progressRatio * minSquad));
  const behindPace = progressRatio >= 0.2 && team.squadSize < expectedByNow * 0.5 && slotsNeeded > 3;

  if (action === "pass" && behindPace && !isMustBuy) {
    const pacingPrice = state.currentBid
      ? Math.round((state.currentBid.amount + getNextIncrement(state.currentBid.amount)) * 10) / 10
      : (state.currentLot?.basePrice || 0.5);
    if (pacingPrice <= 8) {
      return { action: "bid", reasoning: `Forced bid: severely behind buying pace (${team.squadSize} players, need ${slotsNeeded} more)` };
    }
  }

  if (action === "pass") {
    return { action: "pass", reasoning };
  }

  // Agent chose to bid — engine handles the amount (base price or current + increment)
  return { action: "bid", reasoning };
}
