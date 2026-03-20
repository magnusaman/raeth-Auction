import { z } from "zod/v4";
import { resolveProvider, buildAnthropicBody } from "./llm-providers";

// ─── Zod Schema for LLM Bid Decision ────────────────────────

export const BidDecisionSchema = z.object({
  action: z.enum(["bid", "pass"]),
  reasoning: z.string(),
});

export type LLMBidDecision = z.infer<typeof BidDecisionSchema>;

// ─── Cost Tracking ──────────────────────────────────────────

export interface CostTracker {
  totalCalls: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalLatencyMs: number;
  errors: number;
  retries: number;
  perTeam: Record<
    string,
    { calls: number; promptTokens: number; completionTokens: number }
  >;
}

export function createCostTracker(): CostTracker {
  return {
    totalCalls: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalLatencyMs: 0,
    errors: 0,
    retries: 0,
    perTeam: {},
  };
}

export function recordUsage(
  tracker: CostTracker,
  teamIndex: string,
  usage: { promptTokens: number; completionTokens: number },
  latencyMs: number
) {
  tracker.totalCalls++;
  tracker.totalPromptTokens += usage.promptTokens;
  tracker.totalCompletionTokens += usage.completionTokens;
  tracker.totalLatencyMs += latencyMs;

  if (!tracker.perTeam[teamIndex]) {
    tracker.perTeam[teamIndex] = { calls: 0, promptTokens: 0, completionTokens: 0 };
  }
  tracker.perTeam[teamIndex].calls++;
  tracker.perTeam[teamIndex].promptTokens += usage.promptTokens;
  tracker.perTeam[teamIndex].completionTokens += usage.completionTokens;
}

// ─── LLM Call Options ───────────────────────────────────────

export interface LLMCallOptions {
  model: string;
  messages: { role: string; content: string }[];
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  apiKeyOverride?: string;
}

export interface LLMCallResult {
  content: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  latencyMs: number;
}

// ─── Retry with Exponential Backoff ─────────────────────────

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callLLM(
  options: LLMCallOptions,
  costTracker?: CostTracker
): Promise<LLMCallResult> {
  // Resolve which provider and model to use
  const { provider, resolvedModel } = resolveProvider(options.model);
  const providerApiKey = options.apiKeyOverride || process.env[provider.apiKeyEnvVar];
  if (!providerApiKey) {
    throw new Error(`No ${provider.apiKeyEnvVar} configured`);
  }

  // Build the base request body (OpenAI-compatible format)
  const body: Record<string, unknown> = {
    model: resolvedModel,
    messages: options.messages,
    max_tokens: options.maxTokens || 400,
    temperature: options.temperature ?? 0.3,
  };

  // JSON mode for structured output (only if provider supports it)
  if (options.jsonMode && provider.supportsJsonMode) {
    body.response_format = { type: "json_object" };
  }

  // Prompt caching: mark system prompt for cache (OpenRouter → Anthropic/Google)
  if (!provider.isCustomFormat) {
    const messagesWithCache = options.messages.map((msg, idx) => {
      if (idx === 0 && msg.role === "system") {
        return { ...msg, cache_control: { type: "ephemeral" } };
      }
      return msg;
    });
    body.messages = messagesWithCache;
  }

  // For Anthropic direct API, transform the body to their Messages format
  const requestBody = provider.isCustomFormat
    ? buildAnthropicBody(body)
    : body;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const startTime = Date.now();

      const res = await fetch(provider.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...provider.headers(providerApiKey),
        },
        body: JSON.stringify(requestBody),
      });

      const latencyMs = Date.now() - startTime;

      // Rate limited — retry with backoff
      if (res.status === 429) {
        const retryAfter = res.headers.get("retry-after");
        const delay = retryAfter
          ? parseInt(retryAfter) * 1000
          : BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `[LLM] Rate limited on ${provider.name} (${resolvedModel}), retry in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
        );
        if (costTracker) costTracker.retries++;
        await sleep(delay);
        continue;
      }

      // Server error — retry with backoff
      if (res.status >= 500) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `[LLM] Server error ${res.status} on ${provider.name} (${resolvedModel}), retry in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
        );
        if (costTracker) costTracker.retries++;
        await sleep(delay);
        continue;
      }

      // Client error — don't retry
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(
          `LLM API error ${res.status} (${provider.name}): ${errBody.slice(0, 200)}`
        );
      }

      const data = await res.json();

      // Use the provider's response parser to normalize the result
      const parsed = provider.parseResponse(data);

      return {
        content: parsed.content,
        usage: parsed.usage,
        latencyMs,
      };
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `[LLM] Error on ${provider.name} (${resolvedModel}): ${lastError.message}, retry in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
        );
        if (costTracker) costTracker.retries++;
        await sleep(delay);
      }
    }
  }

  if (costTracker) costTracker.errors++;
  throw lastError || new Error("LLM call failed after retries");
}

// ─── Parse Agent Decision (JSON → regex fallback → Zod validation) ──

export function parseAgentDecision(content: string): LLMBidDecision {
  // 1. Try JSON parse first (structured output / JSON mode)
  try {
    const parsed = JSON.parse(content);
    const result = BidDecisionSchema.safeParse(parsed);
    if (result.success) return result.data;
  } catch {
    // Not JSON — fall through to regex
  }

  // 2. Try to extract JSON from mixed content (e.g. ```json {...} ```)
  const jsonMatch = content.match(/\{[\s\S]*?"action"\s*:\s*"(bid|pass)"[\s\S]*?\}/i);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const result = BidDecisionSchema.safeParse(parsed);
      if (result.success) return result.data;
    } catch {
      // Malformed JSON block — fall through
    }
  }

  // 3. Regex fallback for ACTION: bid/pass format
  const actionMatch = content.match(/ACTION:\s*(bid|pass)/i);
  const reasoningMatch = content.match(/REASONING:\s*([\s\S]+?)(?:\n|$)/i);

  const action = actionMatch?.[1]?.toLowerCase() === "bid" ? "bid" : "pass";
  const reasoning = reasoningMatch?.[1]?.trim() || content.slice(0, 200);

  // Validate with Zod
  const result = BidDecisionSchema.safeParse({ action, reasoning });
  if (result.success) return result.data;

  // 4. Ultimate fallback — pass with whatever reasoning we got
  return { action: "pass", reasoning: reasoning || "Failed to parse LLM response" };
}
