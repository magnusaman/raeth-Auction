import { GraderResult } from "../types";
import { callLLM as callLLMClient } from "../llm";

// Model-based graders use LLM (via OpenRouter) to evaluate nuanced aspects
// These are called post-auction during evaluation
// Now uses the unified LLM client with retry + exponential backoff

async function callLLM(prompt: string): Promise<string> {
  try {
    const result = await callLLMClient({
      model: "anthropic/claude-sonnet-4",
      messages: [{ role: "user", content: prompt }],
      maxTokens: 500,
      temperature: 0,
    });
    return result.content || "No response";
  } catch (error) {
    console.error("[ModelGrader] LLM call failed after retries:", error);
    return "Model grader failed";
  }
}

function parseScore(response: string): number {
  const match = response.match(/SCORE:\s*([\d.]+)/i);
  return match ? Math.max(0, Math.min(1, parseFloat(match[1]))) : 0.5;
}

// ─── 1. Reasoning Quality ───────────────────────────────────

export async function gradeReasoningQuality(
  bidReasonings: { lotNumber: number; reasoning: string; playerStats: string }[]
): Promise<GraderResult> {
  if (bidReasonings.length === 0) {
    return { graderName: "reasoning_quality", score: 0, details: "No reasoning provided" };
  }

  const sample = bidReasonings.slice(0, 10); // Sample 10 decisions
  const reasoningText = sample
    .map((r) => `Lot ${r.lotNumber}: "${r.reasoning}" (Player stats: ${r.playerStats})`)
    .join("\n\n");

  const prompt = `You are evaluating an AI agent's reasoning quality in a cricket player auction.

Here are sample bid/pass decisions with the agent's reasoning:

${reasoningText}

Rate the reasoning quality on these criteria:
1. Does it reference specific stats from the player data?
2. Is the logic sound (not contradictory)?
3. Does it consider team needs and budget?
4. Is it specific (not generic filler text)?

Respond with exactly: SCORE: X.XX (0-1) followed by a brief explanation.`;

  const response = await callLLM(prompt);
  const score = parseScore(response);

  return {
    graderName: "reasoning_quality",
    score,
    details: response.slice(0, 200),
  };
}

// ─── 2. Strategic Coherence ──────────────────────────────────

export async function gradeStrategicCoherence(
  squadComposition: string,
  bidHistory: string
): Promise<GraderResult> {
  const prompt = `Evaluate this AI agent's strategic coherence in a cricket auction.

Final Squad:
${squadComposition}

Key bidding decisions (chronological):
${bidHistory}

Does the squad-building follow a clear, consistent strategy? Consider:
1. Was there a visible plan (e.g., batting-heavy, bowling-focused, balanced)?
2. Did early picks inform later priorities?
3. Were decisions consistent with stated reasoning?

Respond with exactly: SCORE: X.XX (0-1) followed by a brief explanation.`;

  const response = await callLLM(prompt);
  return {
    graderName: "strategic_coherence",
    score: parseScore(response),
    details: response.slice(0, 200),
  };
}

// ─── 3. No Hallucination ────────────────────────────────────

export async function gradeNoHallucination(
  bidReasonings: { reasoning: string; actualStats: string }[]
): Promise<GraderResult> {
  if (bidReasonings.length === 0) {
    return { graderName: "no_hallucination", score: 1, details: "No reasoning to check" };
  }

  const sample = bidReasonings.slice(0, 8);
  const text = sample
    .map((r, i) => `Decision ${i + 1}:\nReasoning: "${r.reasoning}"\nActual stats provided: ${r.actualStats}`)
    .join("\n\n");

  const prompt = `Check if this AI agent hallucinated any cricket statistics in its auction reasoning.

${text}

Did the agent invent or reference stats/records NOT present in the provided data?
Look for: made-up averages, invented match histories, referenced performances not in the data.

Respond with exactly: SCORE: X.XX (0-1, where 1 = no hallucinations) followed by examples if found.`;

  const response = await callLLM(prompt);
  return {
    graderName: "no_hallucination",
    score: parseScore(response),
    details: response.slice(0, 200),
  };
}

// ─── 4. Adaptation ──────────────────────────────────────────

export async function gradeAdaptation(
  earlyDecisions: string,
  lateDecisions: string,
  squadStateChanges: string
): Promise<GraderResult> {
  const prompt = `Evaluate how well this AI agent adapted its strategy during a cricket auction.

Early auction decisions (lots 1-20):
${earlyDecisions}

Late auction decisions (lots 60+):
${lateDecisions}

Squad state changes:
${squadStateChanges}

Did the agent adapt to:
1. Changing budget constraints?
2. Evolving team needs (roles filled vs gaps)?
3. Opponent behavior (aggressive bidding from others)?
4. Market dynamics (prices rising/falling)?

Respond with exactly: SCORE: X.XX (0-1) followed by a brief explanation.`;

  const response = await callLLM(prompt);
  return {
    graderName: "adaptation",
    score: parseScore(response),
    details: response.slice(0, 200),
  };
}

// ─── 5. Emotional Discipline ────────────────────────────────

export async function gradeEmotionalDiscipline(
  bidHistory: { lotNumber: number; action: string; amount?: number; reasoning: string; previousLotResult: string }[]
): Promise<GraderResult> {
  const sample = bidHistory.slice(0, 12);
  const text = sample
    .map((b) => `Lot ${b.lotNumber} (previous: ${b.previousLotResult}): ${b.action}${b.amount ? ` ₹${b.amount}Cr` : ""} — "${b.reasoning}"`)
    .join("\n");

  const prompt = `Evaluate this AI agent's emotional discipline in a cricket auction.

Bid history with context:
${text}

Look for signs of:
1. Revenge bidding (overbidding after losing a target)
2. FOMO (bidding on every player after missing out)
3. Tilt (irrational decisions after a bad outcome)
4. Sunk cost (continuing to bid just because already invested)

Respond with exactly: SCORE: X.XX (0-1, where 1 = perfect discipline) followed by examples if found.`;

  const response = await callLLM(prompt);
  return {
    graderName: "emotional_discipline",
    score: parseScore(response),
    details: response.slice(0, 200),
  };
}

// ─── 6. Narrative Resistance ────────────────────────────────

export async function gradeNarrativeResistance(
  highProfileBids: { playerName: string; styleTags: string[]; basePrice: number; finalPrice?: number; reasoning: string }[]
): Promise<GraderResult> {
  if (highProfileBids.length === 0) {
    return { graderName: "narrative_resistance", score: 0.7, details: "No high-profile bids to evaluate" };
  }

  const text = highProfileBids
    .map((b) => `${b.playerName} (tags: ${b.styleTags.join(", ")}, base: ₹${b.basePrice}Cr${b.finalPrice ? `, final: ₹${b.finalPrice}Cr` : ""}): "${b.reasoning}"`)
    .join("\n");

  const prompt = `Evaluate if this AI agent resisted narrative bias in a cricket auction.

High-profile player bids:
${text}

"Narrative resistance" means not overpaying simply because:
1. Player has impressive-sounding tags/descriptions
2. Player seems like a "star" based on name/profile
3. High base price creates anchoring bias
4. Tags like "marquee_material" inflate perceived value

Did the agent evaluate on stats/merit or get swayed by narratives?

Respond with exactly: SCORE: X.XX (0-1, where 1 = pure stats-based) followed by a brief explanation.`;

  const response = await callLLM(prompt);
  return {
    graderName: "narrative_resistance",
    score: parseScore(response),
    details: response.slice(0, 200),
  };
}
