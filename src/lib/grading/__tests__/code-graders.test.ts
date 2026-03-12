import { describe, it, expect } from "vitest";
import {
  gradeBudgetEfficiency,
  gradeValuationAccuracy,
  gradeSquadBalance,
  gradeOverbidPenalty,
  gradeTrapResistance,
  gradeValueDiscovery,
} from "@/lib/grading/code-graders";

// ─── gradeBudgetEfficiency ──────────────────────────────────

describe("gradeBudgetEfficiency", () => {
  it("returns score 0 when squad is below minimum size", () => {
    const result = gradeBudgetEfficiency(50, 100, 10, 15);
    expect(result.score).toBe(0);
    expect(result.graderName).toBe("budget_efficiency");
  });

  it("returns perfect score (1.0) for ideal spending range (85-98%)", () => {
    const result = gradeBudgetEfficiency(90, 100, 15, 15);
    expect(result.score).toBe(1.0);
  });

  it("returns 0.95 for spending above 98%", () => {
    const result = gradeBudgetEfficiency(99, 100, 15, 15);
    expect(result.score).toBe(0.95);
  });

  it("returns a moderate score for 70-85% spending", () => {
    const result = gradeBudgetEfficiency(75, 100, 15, 15);
    expect(result.score).toBeGreaterThan(0.6);
    expect(result.score).toBeLessThan(1.0);
  });

  it("returns a lower score for 50-70% spending", () => {
    const result = gradeBudgetEfficiency(60, 100, 15, 15);
    expect(result.score).toBeGreaterThan(0.2);
    expect(result.score).toBeLessThan(0.7);
  });

  it("returns a low score for very underspent (<50%)", () => {
    const result = gradeBudgetEfficiency(30, 100, 15, 15);
    expect(result.score).toBeLessThan(0.3);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it("includes spending details in the result", () => {
    const result = gradeBudgetEfficiency(90, 100, 15, 15);
    expect(result.details).toContain("90.0");
    expect(result.details).toContain("100");
  });

  it("clamps score between 0 and 1", () => {
    // Edge case: 0 spent
    const result = gradeBudgetEfficiency(0, 100, 15, 15);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });
});

// ─── gradeValuationAccuracy ─────────────────────────────────

describe("gradeValuationAccuracy", () => {
  it("returns score 0 when no players bought", () => {
    const result = gradeValuationAccuracy([]);
    expect(result.score).toBe(0);
    expect(result.details).toBe("No players bought");
  });

  it("returns high score for paying exactly true value", () => {
    const result = gradeValuationAccuracy([
      { pricePaid: 5, trueValue: 5 },
    ]);
    // ratio = 1.0, accuracy = 1.0
    expect(result.score).toBe(1.0);
  });

  it("returns good score for underpaying", () => {
    const result = gradeValuationAccuracy([
      { pricePaid: 3, trueValue: 5 },
    ]);
    // ratio = 0.6, accuracy = 0.7 + 0.6*0.3 = 0.88
    expect(result.score).toBeGreaterThan(0.8);
  });

  it("penalizes slight overpay", () => {
    const result = gradeValuationAccuracy([
      { pricePaid: 7, trueValue: 5 },
    ]);
    // ratio = 1.4, accuracy = 1.0 - 0.4*1.2 = 0.52
    expect(result.score).toBeGreaterThan(0.4);
    expect(result.score).toBeLessThan(0.7);
  });

  it("heavily penalizes significant overpay", () => {
    const result = gradeValuationAccuracy([
      { pricePaid: 10, trueValue: 5 },
    ]);
    // ratio = 2.0, accuracy = 0.4 - (2.0-1.5)*0.3 = 0.25
    expect(result.score).toBeLessThan(0.4);
  });

  it("gives minimum score for extreme overpay", () => {
    const result = gradeValuationAccuracy([
      { pricePaid: 20, trueValue: 5 },
    ]);
    // ratio = 4.0, accuracy = 0.1
    expect(result.score).toBeLessThanOrEqual(0.1);
  });

  it("averages across multiple players", () => {
    const result = gradeValuationAccuracy([
      { pricePaid: 5, trueValue: 5 },   // perfect
      { pricePaid: 10, trueValue: 5 },  // overpay
    ]);
    expect(result.score).toBeGreaterThan(0.3);
    expect(result.score).toBeLessThan(0.8);
  });

  it("handles trueValue of 0", () => {
    const result = gradeValuationAccuracy([
      { pricePaid: 5, trueValue: 0 },
    ]);
    // ratio = 2 (fallback), accuracy = 0.4 - (2-1.5)*0.3 = 0.25
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });
});

// ─── gradeSquadBalance ──────────────────────────────────────

describe("gradeSquadBalance", () => {
  it("returns perfect score (1.0) when all roles met", () => {
    const result = gradeSquadBalance(
      { BATSMAN: 5, BOWLER: 5, ALL_ROUNDER: 3, WICKET_KEEPER: 2 },
      { batsmen: 5, bowlers: 5, allRounders: 3, keepers: 2 }
    );
    expect(result.score).toBe(1.0);
  });

  it("returns partial score when some roles are short", () => {
    const result = gradeSquadBalance(
      { BATSMAN: 5, BOWLER: 3, ALL_ROUNDER: 3, WICKET_KEEPER: 2 },
      { batsmen: 5, bowlers: 5, allRounders: 3, keepers: 2 }
    );
    // Batsmen: 1.0*0.25, Bowlers: 0.6*0.25, ARs: 1.0*0.25, WKs: 1.0*0.25
    expect(result.score).toBeLessThan(1.0);
    expect(result.score).toBeGreaterThan(0.5);
  });

  it("returns 0 when no players at all", () => {
    const result = gradeSquadBalance(
      {},
      { batsmen: 5, bowlers: 5, allRounders: 3, keepers: 2 }
    );
    expect(result.score).toBe(0);
  });

  it("returns score exceeding requirements as capped at 1.0 per role", () => {
    const result = gradeSquadBalance(
      { BATSMAN: 10, BOWLER: 10, ALL_ROUNDER: 6, WICKET_KEEPER: 4 },
      { batsmen: 5, bowlers: 5, allRounders: 3, keepers: 2 }
    );
    expect(result.score).toBe(1.0);
  });

  it("includes role details in the result", () => {
    const result = gradeSquadBalance(
      { BATSMAN: 3, BOWLER: 5, ALL_ROUNDER: 3, WICKET_KEEPER: 2 },
      { batsmen: 5, bowlers: 5, allRounders: 3, keepers: 2 }
    );
    expect(result.details).toContain("Batsmen: 3/5");
  });
});

// ─── gradeOverbidPenalty ────────────────────────────────────

describe("gradeOverbidPenalty", () => {
  it("returns score 0 when no players bought", () => {
    const result = gradeOverbidPenalty([]);
    expect(result.score).toBe(0);
    expect(result.details).toBe("No players bought");
  });

  it("returns 0 (no penalty) when all players bought at or below true value", () => {
    const result = gradeOverbidPenalty([
      { pricePaid: 3, trueValue: 5 },
      { pricePaid: 5, trueValue: 5 },
    ]);
    expect(result.score).toBe(-0); // no overpay = -0 (Math negation of 0)
  });

  it("returns negative score for overpaid players", () => {
    const result = gradeOverbidPenalty([
      { pricePaid: 8, trueValue: 5 },
    ]);
    // overpay = 3, avgOverpay = 3, score = -min(1, 3/5) = -0.6
    expect(result.score).toBeLessThan(0);
    expect(result.score).toBeGreaterThanOrEqual(-1);
  });

  it("returns -1 for extreme overpay", () => {
    const result = gradeOverbidPenalty([
      { pricePaid: 15, trueValue: 5 },
    ]);
    // overpay = 10, avgOverpay = 10, score = -min(1, 10/5) = -1
    expect(result.score).toBe(-1);
  });

  it("includes total and worst overpay in details", () => {
    const result = gradeOverbidPenalty([
      { pricePaid: 7, trueValue: 5 },
      { pricePaid: 10, trueValue: 3 },
    ]);
    expect(result.details).toContain("Total overpay");
    expect(result.details).toContain("worst single");
  });
});

// ─── gradeTrapResistance ────────────────────────────────────

describe("gradeTrapResistance", () => {
  it("returns perfect score (1.0) when no trap players bought", () => {
    const result = gradeTrapResistance([
      { isTrap: false, pricePaid: 5, trueValue: 5 },
      { isTrap: false, pricePaid: 3, trueValue: 4 },
    ]);
    expect(result.score).toBe(1.0);
    expect(result.details).toContain("No trap players");
  });

  it("returns perfect score for empty squad", () => {
    const result = gradeTrapResistance([]);
    expect(result.score).toBe(1.0);
  });

  it("penalizes buying trap players", () => {
    const result = gradeTrapResistance([
      { isTrap: true, pricePaid: 8, trueValue: 3 },
    ]);
    // trapsBought.length = 1, avgOverpay = 5
    // score = max(0, 1 - 1*0.25 - 5*0.05) = max(0, 1 - 0.25 - 0.25) = 0.5
    expect(result.score).toBe(0.5);
  });

  it("heavily penalizes buying multiple traps", () => {
    const result = gradeTrapResistance([
      { isTrap: true, pricePaid: 8, trueValue: 3 },
      { isTrap: true, pricePaid: 10, trueValue: 2 },
      { isTrap: true, pricePaid: 6, trueValue: 1 },
    ]);
    expect(result.score).toBeLessThan(0.3);
  });

  it("includes trap details in the result", () => {
    const result = gradeTrapResistance([
      { isTrap: true, pricePaid: 5, trueValue: 2 },
    ]);
    expect(result.details).toContain("1 trap players");
  });
});

// ─── gradeValueDiscovery ────────────────────────────────────

describe("gradeValueDiscovery", () => {
  it("returns 0.5 when no sleepers in pool", () => {
    const result = gradeValueDiscovery(
      [{ isSleeper: false, pricePaid: 5, trueValue: 5, impactScore: 60 }],
      0
    );
    expect(result.score).toBe(0.5);
  });

  it("rewards finding sleeper players", () => {
    const result = gradeValueDiscovery(
      [
        { isSleeper: true, pricePaid: 2, trueValue: 7, impactScore: 70 },
      ],
      5
    );
    // discoveryRate = 1/5 = 0.2, undervalued(2 < 7*0.8=5.6) = 1
    // score = min(1, 0.2*0.7 + 0.05 + 0.2) = min(1, 0.14 + 0.05 + 0.2) = 0.39
    expect(result.score).toBeGreaterThan(0.3);
  });

  it("returns low score when no sleepers found", () => {
    const result = gradeValueDiscovery(
      [
        { isSleeper: false, pricePaid: 5, trueValue: 5, impactScore: 50 },
      ],
      5
    );
    // discoveryRate = 0, no undervalued (5 < 5*0.8=4? no), no sleepers bonus
    // score = min(1, 0 + 0 + 0) = 0
    expect(result.score).toBe(0);
  });

  it("gives bonus for undervalued picks even without sleepers", () => {
    const result = gradeValueDiscovery(
      [
        { isSleeper: false, pricePaid: 2, trueValue: 10, impactScore: 50 },
        { isSleeper: false, pricePaid: 3, trueValue: 10, impactScore: 50 },
      ],
      5
    );
    // undervalued: both (2 < 8, 3 < 8), bonus = min(0.3, 2*0.05) = 0.1
    // discoveryRate = 0, no sleeper bonus
    // score = min(1, 0 + 0.1 + 0) = 0.1
    expect(result.score).toBe(0.1);
  });

  it("includes discovery stats in details", () => {
    const result = gradeValueDiscovery(
      [
        { isSleeper: true, pricePaid: 2, trueValue: 7, impactScore: 70 },
      ],
      3
    );
    expect(result.details).toContain("1/3 sleepers found");
  });

  it("caps the undervalue bonus at 0.3", () => {
    const manyUndervalued = Array.from({ length: 10 }, () => ({
      isSleeper: false,
      pricePaid: 1,
      trueValue: 10,
      impactScore: 50,
    }));
    const result = gradeValueDiscovery(manyUndervalued, 5);
    // bonus = min(0.3, 10*0.05) = 0.3
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.score).toBe(0.3);
  });
});
