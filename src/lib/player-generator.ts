import {
  SyntheticPlayer,
  PlayerRole,
  PlayerSubType,
  CareerStats,
  SeasonRecord,
  HiddenSeasonPerf,
} from "./types";
import {
  generateIndianName,
  generateOverseasName,
  randomFrom,
} from "@/data/name-pools";
import {
  BATTING_STATS,
  BOWLING_STATS,
  ALLROUNDER_STATS,
  KEEPER_STATS,
  AGE_DISTRIBUTION,
  BASE_PRICE_TIERS,
  StatDistribution,
} from "@/data/stat-distributions";

// ─── Utility: Sample from normal distribution ────────────────

function gaussianRandom(mean: number, std: number): number {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * std;
}

function sampleStat(dist: StatDistribution): number {
  const val = gaussianRandom(dist.mean, dist.std);
  return Math.round(Math.max(dist.min, Math.min(dist.max, val)) * 100) / 100;
}

function sampleInt(dist: StatDistribution): number {
  return Math.round(sampleStat(dist));
}

// ─── Age Generation ──────────────────────────────────────────

function generateAge(): number {
  const roll = Math.random();
  if (roll < 0.2) return sampleInt(AGE_DISTRIBUTION.youngster);
  if (roll < 0.75) return sampleInt(AGE_DISTRIBUTION.prime);
  return sampleInt(AGE_DISTRIBUTION.veteran);
}

// ─── Base Price ──────────────────────────────────────────────

function generateBasePrice(careerStats: CareerStats, role: PlayerRole): number {
  // Weighted random from tiers, biased by performance
  const totalWeight = BASE_PRICE_TIERS.reduce((s, t) => s + t.weight, 0);
  let roll = Math.random() * totalWeight;
  let basePrice = 0.5;

  for (const tier of BASE_PRICE_TIERS) {
    roll -= tier.weight;
    if (roll <= 0) {
      basePrice = tier.price;
      break;
    }
  }

  // Bump price for high performers
  if (role === "BATSMAN" && careerStats.battingAvg && careerStats.battingAvg > 35) {
    basePrice = Math.max(basePrice, 1.5);
  }
  if (role === "BOWLER" && careerStats.economy && careerStats.economy < 7.5) {
    basePrice = Math.max(basePrice, 1.5);
  }
  if (careerStats.matches && careerStats.matches > 120) {
    basePrice = Math.max(basePrice, 1.0);
  }

  return basePrice;
}

// ─── Generate Batsman ────────────────────────────────────────

function generateBatsman(): {
  subType: PlayerSubType;
  careerStats: CareerStats;
  styleTags: string[];
} {
  const subTypes: { type: PlayerSubType; dist: typeof BATTING_STATS.topOrder; tags: string[][] }[] = [
    {
      type: "powerplay_hitter",
      dist: BATTING_STATS.topOrder,
      tags: [["powerplay_specialist", "aggressive_opener"], ["big_hitter", "fast_starter"]],
    },
    {
      type: "anchor",
      dist: BATTING_STATS.topOrder,
      tags: [["consistent", "anchor"], ["sheet_anchor", "run_accumulator"]],
    },
    {
      type: "finisher",
      dist: BATTING_STATS.finisher,
      tags: [["finisher", "death_overs_specialist"], ["big_hitter", "pressure_player"]],
    },
    {
      type: "accumulator",
      dist: BATTING_STATS.middleOrder,
      tags: [["middle_order", "versatile"], ["stabilizer", "rotation_expert"]],
    },
  ];

  const chosen = randomFrom(subTypes);
  const d = chosen.dist;

  const matches = sampleInt(d.matches);
  const innings = Math.min(matches, sampleInt(d.innings));

  return {
    subType: chosen.type,
    careerStats: {
      matches,
      innings,
      runs: sampleInt(d.runs),
      battingAvg: sampleStat(d.avg),
      strikeRate: sampleStat(d.strikeRate),
      fifties: sampleInt(d.fifties),
      hundreds: sampleInt(d.hundreds),
      boundaryPct: sampleStat(d.boundaryPct),
      dotPct: sampleStat(d.dotPct),
    },
    styleTags: randomFrom(chosen.tags),
  };
}

// ─── Generate Bowler ─────────────────────────────────────────

function generateBowler(): {
  subType: PlayerSubType;
  careerStats: CareerStats;
  styleTags: string[];
} {
  const subTypes: { type: PlayerSubType; dist: typeof BOWLING_STATS.pace; tags: string[][] }[] = [
    {
      type: "pace_ace",
      dist: BOWLING_STATS.pace,
      tags: [["express_pace", "new_ball"], ["pace_battery", "wicket_taker"]],
    },
    {
      type: "death_bowler",
      dist: BOWLING_STATS.deathBowler,
      tags: [["death_overs_specialist", "yorker_expert"], ["variations_master", "clutch_bowler"]],
    },
    {
      type: "spin_wizard",
      dist: BOWLING_STATS.spin,
      tags: [["spin_specialist", "flight_and_guile"], ["economical", "middle_overs_control"]],
    },
    {
      type: "powerplay_bowler",
      dist: BOWLING_STATS.pace,
      tags: [["powerplay_specialist", "swing_bowler"], ["new_ball", "early_wickets"]],
    },
    {
      type: "medium_pace",
      dist: BOWLING_STATS.pace,
      tags: [["medium_pace", "workhorse"], ["seam_bowler", "consistent"]],
    },
  ];

  const chosen = randomFrom(subTypes);
  const d = chosen.dist;

  const matches = sampleInt(d.matches);

  return {
    subType: chosen.type,
    careerStats: {
      matches,
      innings: matches,
      wickets: sampleInt(d.wickets),
      bowlingAvg: sampleStat(d.bowlingAvg),
      economy: sampleStat(d.economy),
      bowlingStrikeRate: sampleStat(d.bowlingSR),
      dotBallPct: sampleStat(d.dotBallPct),
    },
    styleTags: randomFrom(chosen.tags),
  };
}

// ─── Generate All-Rounder ────────────────────────────────────

function generateAllRounder(): {
  subType: PlayerSubType;
  careerStats: CareerStats;
  styleTags: string[];
} {
  const isBattingAR = Math.random() < 0.5;
  const d = isBattingAR ? ALLROUNDER_STATS.battingAR : ALLROUNDER_STATS.bowlingAR;

  const matches = sampleInt(d.batting.matches);

  return {
    subType: isBattingAR ? "batting_allrounder" : "bowling_allrounder",
    careerStats: {
      matches,
      innings: matches,
      runs: sampleInt(d.batting.runs),
      battingAvg: sampleStat(d.batting.avg),
      strikeRate: sampleStat(d.batting.strikeRate),
      wickets: sampleInt(d.bowling.wickets),
      bowlingAvg: sampleStat(d.bowling.bowlingAvg),
      economy: sampleStat(d.bowling.economy),
    },
    styleTags: isBattingAR
      ? ["batting_allrounder", "impact_player"]
      : ["bowling_allrounder", "utility_player"],
  };
}

// ─── Generate Wicket-Keeper ──────────────────────────────────

function generateKeeper(): {
  subType: PlayerSubType;
  careerStats: CareerStats;
  styleTags: string[];
} {
  const d = KEEPER_STATS.keeperBatsman;
  const matches = sampleInt(d.matches);
  const innings = Math.min(matches, sampleInt(d.innings));
  const isSpecialist = Math.random() < 0.3;

  return {
    subType: isSpecialist ? "keeper_specialist" : "keeper_batsman",
    careerStats: {
      matches,
      innings,
      runs: isSpecialist ? sampleInt({ ...d.runs, mean: d.runs.mean * 0.5 }) : sampleInt(d.runs),
      battingAvg: isSpecialist
        ? sampleStat({ ...d.avg, mean: d.avg.mean * 0.7 })
        : sampleStat(d.avg),
      strikeRate: sampleStat(d.strikeRate),
      catches: sampleInt(d.catches),
      stumpings: sampleInt(d.stumpings),
    },
    styleTags: isSpecialist
      ? ["keeper_specialist", "safe_hands"]
      : ["keeper_batsman", "aggressive_keeper"],
  };
}

// ─── Generate Recent Form ───────────────────────────────────

function generateRecentForm(
  role: PlayerRole,
  careerStats: CareerStats,
  isTrap: boolean,
  isSleeper: boolean
): SeasonRecord[] {
  const seasons: SeasonRecord[] = [];

  for (let s = 3; s >= 1; s--) {
    const matches = Math.floor(8 + Math.random() * 8); // 8-15 matches per season
    const formMultiplier = isTrap
      ? 1.2 - (3 - s) * 0.1 // trap: looks like improving form
      : isSleeper
        ? 0.8 + (3 - s) * 0.05 // sleeper: looks mediocre/declining
        : 0.85 + Math.random() * 0.3; // normal variance

    const season: SeasonRecord = {
      season: s,
      matches,
      rating: Math.max(1, Math.min(10, Math.round((5 + Math.random() * 4) * formMultiplier))),
    };

    if (role === "BATSMAN" || role === "ALL_ROUNDER" || role === "WICKET_KEEPER") {
      const baseAvg = careerStats.battingAvg || 25;
      const baseSR = careerStats.strikeRate || 130;
      season.runs = Math.round(matches * baseAvg * formMultiplier * (0.7 + Math.random() * 0.6));
      season.avg = Math.round(baseAvg * formMultiplier * 100) / 100;
      season.sr = Math.round(baseSR * (0.9 + Math.random() * 0.2) * 100) / 100;
    }

    if (role === "BOWLER" || role === "ALL_ROUNDER") {
      const baseEcon = careerStats.economy || 8;
      season.wickets = Math.round(matches * (1 + Math.random()) * formMultiplier);
      season.economy = Math.round(baseEcon * (1.1 - formMultiplier * 0.1 + Math.random() * 0.3) * 100) / 100;
    }

    seasons.push(season);
  }

  return seasons;
}

// ─── Compute Hidden True Value ───────────────────────────────

function computeHiddenValue(
  role: PlayerRole,
  careerStats: CareerStats,
  age: number,
  isTrap: boolean,
  isSleeper: boolean
): { trueValue: number; seasonPerf: HiddenSeasonPerf } {
  let baseValue = 0;

  // Calculate base value from career stats
  if (role === "BATSMAN") {
    const avg = careerStats.battingAvg || 20;
    const sr = careerStats.strikeRate || 120;
    baseValue = (avg / 30) * (sr / 135) * 5; // ~5 Cr for average player
  } else if (role === "BOWLER") {
    const econ = careerStats.economy || 8.5;
    const wickets = careerStats.wickets || 50;
    baseValue = (8.5 / econ) * (wickets / 70) * 5;
  } else if (role === "ALL_ROUNDER") {
    const avg = careerStats.battingAvg || 20;
    const sr = careerStats.strikeRate || 130;
    const econ = careerStats.economy || 8.5;
    baseValue = ((avg / 25) * (sr / 135) * 3 + (8.5 / econ) * 3);
  } else {
    const avg = careerStats.battingAvg || 22;
    const sr = careerStats.strikeRate || 130;
    baseValue = (avg / 28) * (sr / 135) * 4.5;
  }

  // Age adjustment
  if (age < 23) baseValue *= 1.15; // youth premium
  if (age > 33) baseValue *= 0.75; // aging discount

  // Experience bonus
  if (careerStats.matches && careerStats.matches > 100) baseValue *= 1.1;

  // Trap/Sleeper modification
  let seasonMultiplier = 0.8 + Math.random() * 0.4; // normal variance
  if (isTrap) {
    baseValue *= 1.3; // looks valuable
    seasonMultiplier = 0.3 + Math.random() * 0.3; // but performs terribly
  }
  if (isSleeper) {
    baseValue *= 0.6; // looks mediocre
    seasonMultiplier = 1.5 + Math.random() * 0.5; // but breakout season
  }

  const trueValue = Math.round(baseValue * 100) / 100;

  // Generate hidden season performance
  const seasonPerf: HiddenSeasonPerf = {
    matchesPlayed: Math.floor(10 + Math.random() * 5),
    overallRating: Math.max(1, Math.min(10,
      Math.round((trueValue / 5) * seasonMultiplier * 10) / 10
    )),
    impactScore: Math.max(0, Math.min(100,
      Math.round(trueValue * seasonMultiplier * 10)
    )),
  };

  if (role === "BATSMAN" || role === "ALL_ROUNDER" || role === "WICKET_KEEPER") {
    const baseAvg = careerStats.battingAvg || 25;
    const baseSR = careerStats.strikeRate || 130;
    seasonPerf.projectedRuns = Math.round(seasonPerf.matchesPlayed * baseAvg * seasonMultiplier * 0.8);
    seasonPerf.projectedAvg = Math.round(baseAvg * seasonMultiplier * 100) / 100;
    seasonPerf.projectedSR = Math.round(baseSR * (0.9 + seasonMultiplier * 0.1) * 100) / 100;
  }

  if (role === "BOWLER" || role === "ALL_ROUNDER") {
    const baseEcon = careerStats.economy || 8;
    seasonPerf.projectedWickets = Math.round(seasonPerf.matchesPlayed * 1.2 * seasonMultiplier);
    seasonPerf.projectedEconomy = Math.round(baseEcon * (1.1 - seasonMultiplier * 0.15) * 100) / 100;
  }

  return { trueValue, seasonPerf };
}

// ─── Visible Quality Score (for auction ordering) ──────────

function computeVisibleQuality(p: SyntheticPlayer): number {
  const cs = p.careerStats;
  const matchFactor = Math.min(1.3, (cs.matches || 1) / 80);
  let q = 0;

  if (p.role === "BATSMAN") {
    const avg = cs.battingAvg || 20;
    const sr = cs.strikeRate || 120;
    q = (avg / 30) * (sr / 135) * 5 * matchFactor;
    if (cs.hundreds && cs.hundreds > 2) q += 0.5;
    if (cs.fifties && cs.fifties > 10) q += 0.3;
  } else if (p.role === "BOWLER") {
    const econ = cs.economy || 9;
    const wickets = cs.wickets || 30;
    q = (8.5 / econ) * (wickets / 70) * 5 * matchFactor;
    if (cs.dotBallPct && cs.dotBallPct > 45) q += 0.4;
  } else if (p.role === "ALL_ROUNDER") {
    const avg = cs.battingAvg || 20;
    const sr = cs.strikeRate || 125;
    const econ = cs.economy || 9;
    const wickets = cs.wickets || 20;
    q = ((avg / 25) * (sr / 135) * 2.5 + (8.5 / econ) * (wickets / 50) * 2.5) * matchFactor;
  } else {
    // WICKET_KEEPER
    const avg = cs.battingAvg || 20;
    const sr = cs.strikeRate || 125;
    q = (avg / 28) * (sr / 135) * 4.5 * matchFactor;
    if (cs.catches && cs.catches > 30) q += 0.3;
    if (cs.stumpings && cs.stumpings > 10) q += 0.2;
  }

  // Recent form boost — average of last 3 season ratings
  const recentAvg = p.recentForm.reduce((s, r) => s + r.rating, 0) / (p.recentForm.length || 1);
  q += (recentAvg - 5) * 0.3; // boost/penalize based on form

  // Age premium/discount
  if (p.age < 23) q += 0.3;
  if (p.age > 33) q -= 0.5;

  // Base price is already a signal of quality (scaled for IPL range 0.20-2.0 Cr)
  q += p.basePrice * 1.0;

  return Math.round(q * 100) / 100;
}

// ─── Main Generator ─────────────────────────────────────────

export function generatePlayerPool(count: number = 120): SyntheticPlayer[] {
  const players: SyntheticPlayer[] = [];
  const usedNames = new Set<string>();

  // Role distribution: ~30 batsmen, ~25 bowlers, ~15 allrounders, ~10 keepers
  const roleDistribution: { role: PlayerRole; count: number }[] = [
    { role: "BATSMAN", count: Math.round(count * 0.375) },      // 30
    { role: "BOWLER", count: Math.round(count * 0.3125) },      // 25
    { role: "ALL_ROUNDER", count: Math.round(count * 0.1875) }, // 15
    { role: "WICKET_KEEPER", count: Math.round(count * 0.125) }, // 10
  ];

  // Nationality: ~60% Indian, ~40% overseas
  const indianPct = 0.6;

  // Trap/Sleeper injection
  const trapCount = 5 + Math.floor(Math.random() * 4);   // 5-8 traps
  const sleeperCount = 3 + Math.floor(Math.random() * 3); // 3-5 sleepers
  let trapsRemaining = trapCount;
  let sleepersRemaining = sleeperCount;

  for (const { role, count: roleCount } of roleDistribution) {
    for (let i = 0; i < roleCount; i++) {
      // Determine nationality
      const isIndian = Math.random() < indianPct;
      let name: string;
      let nationality: string;

      if (isIndian) {
        do {
          name = generateIndianName();
        } while (usedNames.has(name));
        nationality = "India";
      } else {
        let overseas: { name: string; country: string };
        do {
          overseas = generateOverseasName();
        } while (usedNames.has(overseas.name));
        name = overseas.name;
        nationality = overseas.country;
      }
      usedNames.add(name);

      // Determine if trap/sleeper
      const totalRemaining = roleDistribution.reduce((s, r) => s + r.count, 0) - players.length;
      const isTrap = trapsRemaining > 0 && Math.random() < (trapsRemaining / totalRemaining) * 3;
      const isSleeper = !isTrap && sleepersRemaining > 0 && Math.random() < (sleepersRemaining / totalRemaining) * 3;

      if (isTrap) trapsRemaining--;
      if (isSleeper) sleepersRemaining--;

      // Generate stats based on role
      let subType: PlayerSubType;
      let careerStats: CareerStats;
      let styleTags: string[];

      switch (role) {
        case "BATSMAN": {
          const gen = generateBatsman();
          subType = gen.subType;
          careerStats = gen.careerStats;
          styleTags = gen.styleTags;
          break;
        }
        case "BOWLER": {
          const gen = generateBowler();
          subType = gen.subType;
          careerStats = gen.careerStats;
          styleTags = gen.styleTags;
          break;
        }
        case "ALL_ROUNDER": {
          const gen = generateAllRounder();
          subType = gen.subType;
          careerStats = gen.careerStats;
          styleTags = gen.styleTags;
          break;
        }
        case "WICKET_KEEPER": {
          const gen = generateKeeper();
          subType = gen.subType;
          careerStats = gen.careerStats;
          styleTags = gen.styleTags;
          break;
        }
      }

      const age = generateAge();
      const basePrice = generateBasePrice(careerStats, role);
      const recentForm = generateRecentForm(role, careerStats, isTrap, isSleeper);
      const { trueValue, seasonPerf } = computeHiddenValue(role, careerStats, age, isTrap, isSleeper);

      // Add trap/sleeper tags
      if (isTrap) styleTags.push("marquee_material");
      if (isSleeper) styleTags.push("raw_talent");

      players.push({
        name,
        nationality,
        age,
        role,
        subType,
        basePrice,
        careerStats,
        recentForm,
        styleTags,
        hiddenTrueValue: trueValue,
        hiddenSeasonPerf: seasonPerf,
        isTrap,
        isSleeper,
      });
    }
  }

  // Sort by visible quality score — best players first, weakest last
  const scored = players.map((p) => ({ player: p, quality: computeVisibleQuality(p) }));
  scored.sort((a, b) => b.quality - a.quality);

  // Add slight randomness within quality tiers so it's not perfectly deterministic
  // Swap adjacent players with 20% chance to add variety
  for (let i = 0; i < scored.length - 1; i++) {
    if (Math.random() < 0.2 && Math.abs(scored[i].quality - scored[i + 1].quality) < 1.5) {
      [scored[i], scored[i + 1]] = [scored[i + 1], scored[i]];
    }
  }

  // Assign auction order
  return scored.map((s, idx) => ({ ...s.player, auctionOrder: idx + 1 } as SyntheticPlayer & { auctionOrder: number }));
}
