// AuctionBench Agent Runner
// Polls the auction API and makes decisions via OpenRouter LLM

const AUCTION_URL = process.env.AUCTION_URL || "http://localhost:3000";
const MODEL = process.env.MODEL || "anthropic/claude-sonnet-4";
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || "";
const AGENT_NAME = process.env.AGENT_NAME || `Agent-${Date.now()}`;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || "3000");

let apiKey = "";
let agentId = "";
let _teamId = "";
let auctionId = process.env.AUCTION_ID || "";

async function apiFetch(path, options = {}) {
  const url = `${AUCTION_URL}${path}`;
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const res = await fetch(url, { ...options, headers });
  return res.json();
}

async function register() {
  console.log(`[Agent] Registering as ${AGENT_NAME}...`);
  const data = await apiFetch("/api/v1/agents/register", {
    method: "POST",
    body: JSON.stringify({ name: AGENT_NAME, description: `${MODEL} agent` }),
  });

  if (data.api_key) {
    apiKey = data.api_key;
    agentId = data.agent_id;
    console.log(`[Agent] Registered! ID: ${agentId}`);
  } else {
    console.error("[Agent] Registration failed:", data);
    process.exit(1);
  }
}

async function joinAuction() {
  if (!auctionId) {
    console.error("[Agent] No AUCTION_ID set");
    process.exit(1);
  }

  console.log(`[Agent] Joining auction ${auctionId}...`);
  const data = await apiFetch(`/api/v1/auctions/${auctionId}/join`, {
    method: "POST",
    body: JSON.stringify({}),
  });

  if (data.team_id) {
    _teamId = data.team_id;
    console.log(`[Agent] Joined as ${data.team_name}`);
  } else {
    console.error("[Agent] Join failed:", data);
  }
}

async function getDecision(state) {
  const lot = state.currentLot;
  if (!lot) return { action: "pass", reasoning: "No active lot" };

  const prompt = `You are an AI competing in a cricket player auction.

CURRENT LOT #${lot.lotNumber}: ${lot.name}
Role: ${lot.role} (${lot.subType}) | Age: ${lot.age} | ${lot.nationality}
Base: ₹${lot.basePrice} Cr | Tags: ${lot.styleTags?.join(", ")}
Stats: ${JSON.stringify(lot.careerStats)}
Form: ${JSON.stringify(lot.recentForm)}

Current Bid: ${state.currentBid ? `₹${state.currentBid.amount} Cr` : `₹${lot.basePrice} Cr (base)`}

YOUR TEAM: ₹${state.yourTeam.purseRemaining.toFixed(1)} Cr | ${state.yourTeam.squadSize} players
Need: ${state.yourTeam.needs.batsmenNeeded} bat, ${state.yourTeam.needs.bowlersNeeded} bowl, ${state.yourTeam.needs.allRoundersNeeded} AR, ${state.yourTeam.needs.keepersNeeded} WK
Slots left: ${state.yourTeam.needs.totalSlotsRemaining}

RESPOND EXACTLY:
ACTION: bid OR pass
AMOUNT: X.X (if bidding)
REASONING: brief reason`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: "You are a cricket auction agent. Build the best squad within budget. Be strategic." },
          { role: "user", content: prompt },
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";

    const actionMatch = content.match(/ACTION:\s*(bid|pass)/i);
    const amountMatch = content.match(/AMOUNT:\s*([\d.]+)/i);
    const reasonMatch = content.match(/REASONING:\s*(.+?)(?:\n|$)/is);

    return {
      action: actionMatch?.[1]?.toLowerCase() === "bid" ? "bid" : "pass",
      amount: amountMatch ? parseFloat(amountMatch[1]) : undefined,
      reasoning: reasonMatch?.[1]?.trim() || content.slice(0, 150),
    };
  } catch (err) {
    console.error("[Agent] LLM error:", err.message);
    return { action: "pass", reasoning: "LLM error" };
  }
}

async function pollLoop() {
  while (true) {
    try {
      const state = await apiFetch(`/api/v1/auctions/${auctionId}/state`);

      if (state.phase === "COMPLETE") {
        console.log("[Agent] Auction complete!");
        break;
      }

      if (state.phase === "BIDDING" && state.currentLot) {
        const decision = await getDecision(state);
        console.log(`[Agent] Lot #${state.currentLot.lotNumber}: ${decision.action}${decision.amount ? ` ₹${decision.amount}Cr` : ""}`);

        await apiFetch(`/api/v1/auctions/${auctionId}/bid`, {
          method: "POST",
          body: JSON.stringify(decision),
        });
      }
    } catch (err) {
      console.error("[Agent] Poll error:", err.message);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }
}

async function main() {
  await register();
  await joinAuction();
  await pollLoop();
}

main().catch(console.error);
