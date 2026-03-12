import { describe, it, expect } from "vitest";
import {
  createCostTracker,
  recordUsage,
  parseAgentDecision,
} from "@/lib/llm";

// ─── createCostTracker ──────────────────────────────────────

describe("createCostTracker", () => {
  it("returns a zeroed tracker", () => {
    const tracker = createCostTracker();
    expect(tracker.totalCalls).toBe(0);
    expect(tracker.totalPromptTokens).toBe(0);
    expect(tracker.totalCompletionTokens).toBe(0);
    expect(tracker.totalLatencyMs).toBe(0);
    expect(tracker.errors).toBe(0);
    expect(tracker.retries).toBe(0);
    expect(tracker.perTeam).toEqual({});
  });
});

// ─── recordUsage ────────────────────────────────────────────

describe("recordUsage", () => {
  it("increments totals on a single call", () => {
    const tracker = createCostTracker();
    recordUsage(tracker, "team-0", { promptTokens: 100, completionTokens: 50 }, 200);

    expect(tracker.totalCalls).toBe(1);
    expect(tracker.totalPromptTokens).toBe(100);
    expect(tracker.totalCompletionTokens).toBe(50);
    expect(tracker.totalLatencyMs).toBe(200);
  });

  it("accumulates across multiple calls", () => {
    const tracker = createCostTracker();
    recordUsage(tracker, "team-0", { promptTokens: 100, completionTokens: 50 }, 200);
    recordUsage(tracker, "team-1", { promptTokens: 200, completionTokens: 80 }, 300);
    recordUsage(tracker, "team-0", { promptTokens: 150, completionTokens: 60 }, 250);

    expect(tracker.totalCalls).toBe(3);
    expect(tracker.totalPromptTokens).toBe(450);
    expect(tracker.totalCompletionTokens).toBe(190);
    expect(tracker.totalLatencyMs).toBe(750);
  });

  it("tracks per-team stats correctly", () => {
    const tracker = createCostTracker();
    recordUsage(tracker, "team-0", { promptTokens: 100, completionTokens: 50 }, 200);
    recordUsage(tracker, "team-1", { promptTokens: 200, completionTokens: 80 }, 300);
    recordUsage(tracker, "team-0", { promptTokens: 150, completionTokens: 60 }, 250);

    expect(tracker.perTeam["team-0"]).toEqual({
      calls: 2,
      promptTokens: 250,
      completionTokens: 110,
    });

    expect(tracker.perTeam["team-1"]).toEqual({
      calls: 1,
      promptTokens: 200,
      completionTokens: 80,
    });
  });

  it("initializes per-team entry on first call for that team", () => {
    const tracker = createCostTracker();
    expect(tracker.perTeam["team-99"]).toBeUndefined();

    recordUsage(tracker, "team-99", { promptTokens: 10, completionTokens: 5 }, 100);
    expect(tracker.perTeam["team-99"].calls).toBe(1);
  });
});

// ─── parseAgentDecision ─────────────────────────────────────

describe("parseAgentDecision", () => {
  describe("Tier 1: valid JSON", () => {
    it("parses a valid bid JSON", () => {
      const input = JSON.stringify({ action: "bid", reasoning: "good stats" });
      const result = parseAgentDecision(input);
      expect(result.action).toBe("bid");
      expect(result.reasoning).toBe("good stats");
    });

    it("parses a valid pass JSON", () => {
      const input = JSON.stringify({ action: "pass", reasoning: "too expensive" });
      const result = parseAgentDecision(input);
      expect(result.action).toBe("pass");
      expect(result.reasoning).toBe("too expensive");
    });
  });

  describe("Tier 2: JSON embedded in markdown", () => {
    it("extracts JSON from a markdown code block", () => {
      const input = '```json\n{"action":"pass","reasoning":"too expensive"}\n```';
      const result = parseAgentDecision(input);
      expect(result.action).toBe("pass");
      expect(result.reasoning).toBe("too expensive");
    });

    it("extracts JSON from mixed text content", () => {
      const input = 'Here is my decision:\n{"action":"bid","reasoning":"solid player"}\nThank you.';
      const result = parseAgentDecision(input);
      expect(result.action).toBe("bid");
      expect(result.reasoning).toBe("solid player");
    });
  });

  describe("Tier 3: ACTION/REASONING format", () => {
    it("parses ACTION: bid with REASONING", () => {
      const input = "ACTION: bid\nREASONING: solid player";
      const result = parseAgentDecision(input);
      expect(result.action).toBe("bid");
      expect(result.reasoning).toBe("solid player");
    });

    it("parses ACTION: pass with REASONING", () => {
      const input = "ACTION: pass\nREASONING: overpriced for this role";
      const result = parseAgentDecision(input);
      expect(result.action).toBe("pass");
      expect(result.reasoning).toBe("overpriced for this role");
    });

    it("is case-insensitive for action", () => {
      const input = "ACTION: BID\nREASONING: great value";
      const result = parseAgentDecision(input);
      expect(result.action).toBe("bid");
    });
  });

  describe("Tier 4: invalid input falls back to pass", () => {
    it("returns pass for empty string", () => {
      const result = parseAgentDecision("");
      expect(result.action).toBe("pass");
    });

    it("returns pass for random text", () => {
      const result = parseAgentDecision("I don't know what to do here honestly");
      expect(result.action).toBe("pass");
    });

    it("returns pass for partial/invalid JSON", () => {
      const result = parseAgentDecision('{"action":"bid"');
      expect(result.action).toBe("pass");
    });

    it("includes reasoning from input text on fallback", () => {
      const text = "Some random reasoning text";
      const result = parseAgentDecision(text);
      expect(result.action).toBe("pass");
      // reasoning should contain the original text (sliced to 200)
      expect(result.reasoning.length).toBeGreaterThan(0);
    });
  });
});
