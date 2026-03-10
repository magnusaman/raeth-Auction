#!/usr/bin/env python3
"""
Generate ipl-players.ts from Kaggle IPL datasets:
  - data/kaggle/ipl2025stats/cricket_data_2025.csv  (per-year stats 2008-2024)
  - data/kaggle/ipl2025auction/...csv               (2025 auction base prices, roles, countries)

Selects 120 real IPL players with proper stats, base prices, and hidden valuations.
"""

import csv, json, math, os, random, sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).parent.parent
STATS_CSV = ROOT / "data/kaggle/ipl2025stats/cricket_data_2025.csv"
AUCTION_CSV = next((ROOT / "data/kaggle/ipl2025auction").glob("*.csv"))

OUT_FILE = ROOT / "src/data/ipl-players.ts"

POOL_SIZE = 120

# Role distribution targets
ROLE_TARGETS = {"BATSMAN": 42, "BOWLER": 33, "ALL_ROUNDER": 27, "WICKET_KEEPER": 18}

# IPL base price tiers (in Crores)
IPL_TIERS = [0.20, 0.30, 0.40, 0.50, 0.75, 1.00, 1.50, 2.00]

# Map auction role names to our types
ROLE_MAP = {
    "BATTER": "BATSMAN",
    "BOWLER": "BOWLER",
    "ALL-ROUNDER": "ALL_ROUNDER",
    "WICKETKEEPER": "WICKET_KEEPER",
}

# ═══════════════════════════════════════════════════════════════
# Known overseas players (for players not in auction list)
# ═══════════════════════════════════════════════════════════════
KNOWN_OVERSEAS = {
    "Jos Buttler", "Faf du Plessis", "David Warner", "Glenn Maxwell",
    "Rashid Khan", "Andre Russell", "Quinton de Kock", "Nicholas Pooran",
    "Liam Livingstone", "Sam Curran", "Pat Cummins", "Kagiso Rabada",
    "Trent Boult", "Anrich Nortje", "Phil Salt", "Heinrich Klaasen",
    "Jonny Bairstow", "Shimron Hetmyer", "Rilee Rossouw", "Aiden Markram",
    "David Miller", "Dewald Brevis", "Cameron Green", "Mitchell Marsh",
    "Marcus Stoinis", "Moeen Ali", "Marco Jansen", "Gerald Coetzee",
    "Mitchell Santner", "Adam Zampa", "Lockie Ferguson", "Josh Hazlewood",
    "Matheesha Pathirana", "Maheesh Theekshana", "Wanindu Hasaranga",
    "Alzarri Joseph", "Romario Shepherd", "Devon Conway", "Travis Head",
    "Will Jacks", "Jake Fraser-McGurk", "Mark Wood", "Nathan Ellis",
    "Noor Ahmad", "Tim David", "Rovman Powell", "Sikandar Raza",
    "Dwaine Pretorius", "Naveen-ul-Haq", "Mohsin Khan", "Tristan Stubbs",
    "Tom Curran", "Spencer Johnson", "Rachin Ravindra", "Mitchell Starc",
    "Harry Brook", "Ben Stokes", "Mustafizur Rahman", "Lungi Ngidi",
    "Reeza Hendricks", "Ryan Rickelton", "Chris Jordan",
    "Mukesh Choudhary",  # Indian but name may confuse — actually Indian
    "Rahmanullah Gurbaz",
}

# ═══════════════════════════════════════════════════════════════
# Name normalization helpers
# ═══════════════════════════════════════════════════════════════
NAME_ALIASES = {
    # Stats CSV name -> Auction CSV name
    "B. Sai Sudharsan": "Sai Sudharsan",
    "N. Tilak Varma": "Tilak Varma",
    "Virat Kohli": "Virat Kohli",
    "MS Dhoni": "MS Dhoni",
    "KL Rahul": "KL Rahul",
    "Shubman Gill": "Shubman Gill",
    "Rohit Sharma": "Rohit Sharma",
    "Suryakumar Yadav": "Suryakumar Yadav",
}

def normalize_name(name):
    """Normalize player names for matching."""
    name = name.strip()
    # Remove dots from initials
    name = name.replace(".", ". ").replace("  ", " ").strip()
    return NAME_ALIASES.get(name, name)


# ═══════════════════════════════════════════════════════════════
# 1. Load auction data (base prices, countries, roles)
# ═══════════════════════════════════════════════════════════════
def load_auction_data():
    """Load 2025 auction list for base prices and metadata."""
    auction = {}
    with open(AUCTION_CSV, encoding="utf-8-sig") as f:
        lines = f.readlines()

    for line in lines[6:]:
        parts = line.strip().split(",")
        if len(parts) < 10 or not parts[3].strip():
            continue

        first = parts[3].strip()
        last = parts[4].strip()
        full_name = f"{first} {last}".strip()
        country = parts[5].strip()

        try:
            age = int(float(parts[8].strip())) if parts[8].strip() else 28
        except:
            age = 28

        specialism = parts[9].strip().upper()
        role = ROLE_MAP.get(specialism, "BATSMAN")

        # Base price (in Lakhs, last column) -> convert to Crores
        try:
            price_lakhs = float(parts[-1].strip())
            price_cr = price_lakhs / 100
            # Snap to nearest IPL tier
            price_cr = min(IPL_TIERS, key=lambda t: abs(t - price_cr))
        except:
            price_cr = 0.50

        is_overseas = country.strip().lower() != "india"

        auction[full_name] = {
            "country": country,
            "age": age,
            "role": role,
            "base_price": price_cr,
            "is_overseas": is_overseas,
        }

    return auction


# ═══════════════════════════════════════════════════════════════
# 2. Load per-year player stats
# ═══════════════════════════════════════════════════════════════
def safe_float(val, default=0.0):
    try:
        v = float(val)
        return v if not (math.isnan(v) or math.isinf(v)) else default
    except:
        return default

def safe_int(val, default=0):
    try:
        return int(float(val))
    except:
        return default


def load_stats():
    """Load per-year stats from Kaggle CSV."""
    players = defaultdict(lambda: {"years": {}})

    with open(STATS_CSV) as f:
        r = csv.DictReader(f)
        for row in r:
            name = row["Player_Name"].strip()
            year_str = row.get("Year", "")
            if not year_str or row.get("Runs_Scored") == "No stats":
                continue

            try:
                year = int(float(year_str))
            except:
                continue

            matches_bat = safe_int(row.get("Matches_Batted"))
            matches_bowl = safe_int(row.get("Matches_Bowled"))
            matches = max(matches_bat, matches_bowl)
            if matches == 0:
                continue

            players[name]["years"][year] = {
                "matches": matches,
                "matches_bat": matches_bat,
                "matches_bowl": matches_bowl,
                "innings": matches_bat,
                "not_outs": safe_int(row.get("Not_Outs")),
                "runs": safe_int(row.get("Runs_Scored")),
                "bat_avg": safe_float(row.get("Batting_Average")),
                "bat_sr": safe_float(row.get("Batting_Strike_Rate")),
                "hundreds": safe_int(row.get("Centuries")),
                "fifties": safe_int(row.get("Half_Centuries")),
                "fours": safe_int(row.get("Fours")),
                "sixes": safe_int(row.get("Sixes")),
                "catches": safe_int(row.get("Catches_Taken")),
                "stumpings": safe_int(row.get("Stumpings")),
                "wickets": safe_int(row.get("Wickets_Taken")),
                "bowl_avg": safe_float(row.get("Bowling_Average")),
                "economy": safe_float(row.get("Economy_Rate")),
                "bowl_sr": safe_float(row.get("Bowling_Strike_Rate")),
                "balls_bowled": safe_int(row.get("Balls_Bowled")),
                "runs_conceded": safe_int(row.get("Runs_Conceded")),
            }

    return players


# ═══════════════════════════════════════════════════════════════
# 3. Merge and compute career stats
# ═══════════════════════════════════════════════════════════════
def compute_career(player_years, recent_years=(2022, 2023, 2024)):
    """Compute career aggregates from yearly stats."""
    all_years = sorted(player_years.keys())
    if not all_years:
        return None, None, None

    # Career aggregates (2019-2024 only — auction held in 2025)
    career_years = [y for y in all_years if 2019 <= y <= 2024]
    if not career_years:
        career_years = [y for y in all_years if y >= 2017][-3:]

    total_matches = sum(player_years[y]["matches"] for y in career_years)
    total_innings = sum(player_years[y]["innings"] for y in career_years)
    total_runs = sum(player_years[y]["runs"] for y in career_years)
    total_wickets = sum(player_years[y]["wickets"] for y in career_years)
    total_hundreds = sum(player_years[y]["hundreds"] for y in career_years)
    total_fifties = sum(player_years[y]["fifties"] for y in career_years)
    total_fours = sum(player_years[y]["fours"] for y in career_years)
    total_sixes = sum(player_years[y]["sixes"] for y in career_years)
    total_catches = sum(player_years[y]["catches"] for y in career_years)
    total_stumpings = sum(player_years[y]["stumpings"] for y in career_years)
    total_balls_bowled = sum(player_years[y]["balls_bowled"] for y in career_years)
    total_runs_conceded = sum(player_years[y]["runs_conceded"] for y in career_years)

    # Batting averages (weighted)
    dismissals = total_innings - sum(player_years[y]["not_outs"] for y in career_years)
    bat_avg = round(total_runs / max(1, dismissals), 2) if total_runs > 0 else None

    # Strike rate
    total_balls_faced = sum(safe_int(player_years[y].get("innings", 0)) for y in career_years)
    # Use weighted average of yearly SRs
    sr_sum = 0
    sr_weight = 0
    for y in career_years:
        if player_years[y]["bat_sr"] > 0 and player_years[y]["runs"] > 10:
            sr_sum += player_years[y]["bat_sr"] * player_years[y]["runs"]
            sr_weight += player_years[y]["runs"]
    bat_sr = round(sr_sum / sr_weight, 2) if sr_weight > 0 else None

    # Economy (weighted by balls bowled)
    economy = round(total_runs_conceded / (total_balls_bowled / 6), 2) if total_balls_bowled > 30 else None
    bowl_avg = round(total_runs_conceded / max(1, total_wickets), 2) if total_wickets > 3 else None
    bowl_sr = round(total_balls_bowled / max(1, total_wickets), 1) if total_wickets > 3 else None

    # Boundary %
    boundary_pct = None
    if total_runs > 50:
        boundary_runs = total_fours * 4 + total_sixes * 6
        boundary_pct = round(boundary_runs / total_runs * 100, 1)

    # Dot ball % for bowlers
    dot_pct = None
    if total_balls_bowled > 60:
        # Approximate: assume dots = balls - (runs_conceded / avg_per_scoring_ball)
        scoring_balls = total_runs_conceded / 1.3  # rough estimate
        dot_pct = round(max(0, (total_balls_bowled - scoring_balls) / total_balls_bowled * 100), 1)

    career = {
        "matches": total_matches,
        "innings": total_innings,
    }
    if total_runs > 20:
        career["runs"] = total_runs
        career["battingAvg"] = bat_avg
        career["strikeRate"] = bat_sr
        career["fifties"] = total_fifties
        career["hundreds"] = total_hundreds
        if boundary_pct:
            career["boundaryPct"] = boundary_pct
    if total_wickets > 3:
        career["wickets"] = total_wickets
        career["bowlingAvg"] = bowl_avg
        career["economy"] = economy
        career["bowlingStrikeRate"] = bowl_sr
        if dot_pct:
            career["dotBallPct"] = dot_pct
    career["catches"] = total_catches
    if total_stumpings > 0:
        career["stumpings"] = total_stumpings

    # Recent form (season records for 2022, 2023, 2024)
    recent_form = []
    for i, y in enumerate(sorted(recent_years)):
        if y in player_years:
            yd = player_years[y]
            season_rating = compute_season_rating(yd)
            rec = {
                "season": i + 1,
                "matches": yd["matches"],
                "runs": yd["runs"],
                "wickets": yd["wickets"],
                "avg": yd["bat_avg"],
                "sr": yd["bat_sr"],
                "economy": yd["economy"] if yd["economy"] > 0 else None,
                "rating": season_rating,
            }
            recent_form.append(rec)

    # Hidden performance (2024 season = evaluation)
    hidden = None
    if 2024 in player_years:
        yd = player_years[2024]
        impact = compute_impact_score(yd, career)
        hidden = {
            "projectedRuns": yd["runs"] if yd["runs"] > 10 else None,
            "projectedWickets": yd["wickets"] if yd["wickets"] > 0 else None,
            "projectedAvg": yd["bat_avg"] if yd["bat_avg"] > 0 else None,
            "projectedSR": yd["bat_sr"] if yd["bat_sr"] > 0 else None,
            "projectedEconomy": yd["economy"] if yd["economy"] > 0 else None,
            "matchesPlayed": yd["matches"],
            "overallRating": min(10, max(1, round(impact / 10))),
            "impactScore": impact,
        }

    return career, recent_form, hidden


def compute_season_rating(yd):
    """Rate a season 1-10."""
    score = 3  # base
    runs, wkts = yd["runs"], yd["wickets"]
    bat_avg, bat_sr = yd["bat_avg"], yd["bat_sr"]
    econ = yd["economy"]

    if runs > 400: score += 3
    elif runs > 250: score += 2
    elif runs > 100: score += 1

    if bat_sr > 160: score += 1
    elif bat_sr > 140: score += 0.5

    if wkts > 20: score += 3
    elif wkts > 12: score += 2
    elif wkts > 5: score += 1

    if econ > 0 and econ < 7.5: score += 1
    elif econ > 10: score -= 1

    return min(10, max(1, round(score)))


def compute_impact_score(yd, career):
    """0-100 impact score for a season."""
    score = 30
    runs, wkts = yd["runs"], yd["wickets"]
    matches = max(1, yd["matches"])

    # Batting contribution
    runs_per_match = runs / matches
    if runs_per_match > 40: score += 30
    elif runs_per_match > 25: score += 20
    elif runs_per_match > 15: score += 10

    if yd["bat_sr"] > 160: score += 10
    elif yd["bat_sr"] > 140: score += 5

    # Bowling contribution
    wkts_per_match = wkts / matches
    if wkts_per_match > 1.5: score += 25
    elif wkts_per_match > 1.0: score += 15
    elif wkts_per_match > 0.5: score += 8

    if yd["economy"] > 0 and yd["economy"] < 7.5: score += 10
    elif yd["economy"] > 0 and yd["economy"] < 8.5: score += 5

    return min(100, max(5, score))


# ═══════════════════════════════════════════════════════════════
# 4. Classify subtypes and generate style tags
# ═══════════════════════════════════════════════════════════════
def classify_subtype(role, career, name=""):
    """Classify player subtype based on stats and role."""
    if role == "BATSMAN":
        sr = career.get("strikeRate", 130)
        avg = career.get("battingAvg", 25)
        if sr and sr > 150:
            return "powerplay_hitter"
        elif sr and sr < 125:
            return "accumulator"
        elif avg and avg > 35:
            return "anchor"
        else:
            return "finisher"

    elif role == "BOWLER":
        econ = career.get("economy", 8)
        bowl_sr = career.get("bowlingStrikeRate", 20)
        if econ and econ < 7.5:
            # Check if spin or pace based on economy + strike rate pattern
            if bowl_sr and bowl_sr > 20:
                return "spin_wizard"
            return "pace_ace"
        elif bowl_sr and bowl_sr < 16:
            return "death_bowler"
        elif econ and econ < 8.5:
            return "powerplay_bowler"
        else:
            return "medium_pace"

    elif role == "ALL_ROUNDER":
        runs = career.get("runs", 0)
        wkts = career.get("wickets", 0)
        if runs and wkts:
            if runs > wkts * 20:
                return "batting_allrounder"
            else:
                return "bowling_allrounder"
        return "batting_allrounder"

    else:  # WICKET_KEEPER
        sr = career.get("strikeRate", 130)
        if sr and sr > 140:
            return "keeper_batsman"
        return "keeper_specialist"


def generate_style_tags(role, career, recent_form):
    """Generate descriptive style tags."""
    tags = []

    sr = career.get("strikeRate", 0)
    avg = career.get("battingAvg", 0)
    econ = career.get("economy", 0)
    wkts = career.get("wickets", 0)
    runs = career.get("runs", 0)
    bp = career.get("boundaryPct", 0)
    matches = career.get("matches", 0)

    # Batting tags
    if sr and sr > 155:
        tags.append("explosive_hitter")
    if sr and sr > 140:
        tags.append("aggressive_batsman")
    if avg and avg > 35:
        tags.append("consistent_scorer")
    if bp and bp > 65:
        tags.append("boundary_heavy")
    if sr and sr < 120 and runs and runs > 100:
        tags.append("low_strike_rate")

    # Bowling tags
    if econ and econ > 0 and econ < 7.5:
        tags.append("economical")
    if wkts and wkts > 30:
        tags.append("wicket_taker")

    # Form tags
    if recent_form and len(recent_form) >= 2:
        latest = recent_form[-1]["rating"]
        earlier = recent_form[0]["rating"]
        if latest < earlier - 2:
            tags.append("declining_form")
        elif latest > earlier + 1:
            tags.append("improving_form")

    # Experience
    if matches > 50:
        tags.append("experienced")
    elif matches < 15:
        tags.append("young_talent")

    if career.get("catches", 0) > 15:
        tags.append("athletic_fielder")

    return tags[:5] if tags else ["consistent_performer"]


# ═══════════════════════════════════════════════════════════════
# 5. Compute hidden true value
# ═══════════════════════════════════════════════════════════════
def compute_true_value(career, hidden, role):
    """Compute hidden true value in Crores based on 2024 performance."""
    if not hidden:
        return 2.0  # default low

    impact = hidden["impactScore"]
    rating = hidden["overallRating"]
    matches = hidden["matchesPlayed"]

    # Base value from impact
    value = (impact / 100) * 15

    # Adjust by matches played (more matches = more reliable)
    if matches < 5:
        value *= 0.6
    elif matches > 12:
        value *= 1.2

    # Role bonus
    if role in ("ALL_ROUNDER", "BOWLER"):
        value *= 1.1  # premium for dual/bowling contribution

    return round(max(1.0, min(20.0, value)), 1)


# ═══════════════════════════════════════════════════════════════
# 6. Determine traps and sleepers
# ═══════════════════════════════════════════════════════════════
def is_trap_player(career, hidden, base_price):
    """Trap: looks good on career stats but poor 2024 performance."""
    if not hidden:
        return False
    avg = career.get("battingAvg", 0)
    sr = career.get("strikeRate", 0)
    econ = career.get("economy", 0)
    impact = hidden["impactScore"]

    # Good career stats but low impact
    good_career = (avg is not None and avg > 30) or (econ is not None and econ < 7.5 and career.get("wickets", 0) > 15)
    low_impact = impact < 40
    return bool(good_career and low_impact)


def is_sleeper_player(career, hidden, base_price):
    """Sleeper: moderate career stats but strong 2024 performance."""
    if not hidden:
        return False
    impact = hidden["impactScore"]
    avg = career.get("battingAvg", 0)

    moderate_career = (avg is None or avg < 30) and base_price <= 0.75
    high_impact = impact > 65
    return bool(moderate_career and high_impact)


# ═══════════════════════════════════════════════════════════════
# 7. Select top 120 players
# ═══════════════════════════════════════════════════════════════
def select_players(merged_players):
    """Select top 120 players, role-balanced."""
    # Must have 2024 data (for hidden evaluation) and at least 2 recent years
    eligible = []
    for name, p in merged_players.items():
        if 2024 not in p["stat_years"]:
            continue
        recent_years = [y for y in p["stat_years"] if y >= 2022]
        if len(recent_years) < 1:
            continue
        if p["career"]["matches"] < 3:
            continue
        eligible.append((name, p))

    # Sort by a quality score
    def quality_score(item):
        name, p = item
        career = p["career"]
        hidden = p.get("hidden")
        impact = hidden["impactScore"] if hidden else 20
        matches = career.get("matches", 0)
        return impact * 0.6 + matches * 0.4

    eligible.sort(key=quality_score, reverse=True)

    # Group by role
    by_role = defaultdict(list)
    for name, p in eligible:
        by_role[p["role"]].append((name, p))

    selected = []
    selected_names = set()

    # Fill each role up to target
    for role, target in ROLE_TARGETS.items():
        available = by_role.get(role, [])
        for name, p in available[:target]:
            if name not in selected_names:
                selected.append((name, p))
                selected_names.add(name)

    # Fill remaining with best available
    remaining = [(n, p) for n, p in eligible if n not in selected_names]
    remaining.sort(key=quality_score, reverse=True)
    while len(selected) < POOL_SIZE and remaining:
        selected.append(remaining.pop(0))

    selected = selected[:POOL_SIZE]
    print(f"  Selected {len(selected)} players")

    # Print role distribution
    roles = defaultdict(int)
    overseas = 0
    for name, p in selected:
        roles[p["role"]] += 1
        if p["is_overseas"]:
            overseas += 1
    print(f"  Roles: {dict(roles)}")
    print(f"  Overseas: {overseas}, Indian: {len(selected) - overseas}")

    return selected


# ═══════════════════════════════════════════════════════════════
# 8. Generate TypeScript output
# ═══════════════════════════════════════════════════════════════
def ts_val(v):
    if v is None:
        return "undefined"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, str):
        return json.dumps(v)
    if isinstance(v, (int, float)):
        if math.isinf(v) or math.isnan(v):
            return "0"
        return str(v)
    return json.dumps(v)


def generate_ts(selected):
    """Generate src/data/ipl-players.ts"""
    lines = [
        "// Auto-generated from Kaggle IPL datasets — DO NOT EDIT MANUALLY",
        "// Stats: cricket_data_2025.csv (2008-2024), Auction: TATA IPL 2025 Auction List",
        "// Generated by scripts/generate_from_kaggle.py",
        "",
        'import { SyntheticPlayer } from "@/lib/types";',
        "",
        "export const IPL_PLAYERS: SyntheticPlayer[] = [",
    ]

    for name, p in selected:
        career = p["career"]
        recent_form = p["recent_form"]
        hidden = p["hidden"]

        subtype = classify_subtype(p["role"], career, name)
        tags = generate_style_tags(p["role"], career, recent_form)
        true_val = compute_true_value(career, hidden, p["role"])
        trap = is_trap_player(career, hidden, p["base_price"])
        sleeper = is_sleeper_player(career, hidden, p["base_price"])

        lines.append("  {")
        lines.append(f'    name: {ts_val(name)},')
        lines.append(f'    nationality: {ts_val("Overseas" if p["is_overseas"] else "India")},')
        lines.append(f'    age: {p["age"]},')
        lines.append(f'    role: {ts_val(p["role"])},')
        lines.append(f'    subType: {ts_val(subtype)},')
        lines.append(f'    basePrice: {p["base_price"]},')

        # Career stats
        lines.append("    careerStats: {")
        lines.append(f'      matches: {career["matches"]},')
        lines.append(f'      innings: {career.get("innings", 0)},')
        if "runs" in career:
            lines.append(f'      runs: {career["runs"]},')
            lines.append(f'      battingAvg: {ts_val(career.get("battingAvg"))},')
            lines.append(f'      strikeRate: {ts_val(career.get("strikeRate"))},')
            lines.append(f'      fifties: {career.get("fifties", 0)},')
            lines.append(f'      hundreds: {career.get("hundreds", 0)},')
            if career.get("boundaryPct"):
                lines.append(f'      boundaryPct: {career["boundaryPct"]},')
        if "wickets" in career:
            lines.append(f'      wickets: {career["wickets"]},')
            lines.append(f'      bowlingAvg: {ts_val(career.get("bowlingAvg"))},')
            lines.append(f'      economy: {ts_val(career.get("economy"))},')
            lines.append(f'      bowlingStrikeRate: {ts_val(career.get("bowlingStrikeRate"))},')
            if career.get("dotBallPct"):
                lines.append(f'      dotBallPct: {career["dotBallPct"]},')
        lines.append(f'      catches: {career.get("catches", 0)},')
        if career.get("stumpings"):
            lines.append(f'      stumpings: {career["stumpings"]},')
        lines.append("    },")

        # Recent form
        lines.append("    recentForm: [")
        for rf in recent_form:
            econ_val = ts_val(rf["economy"])
            lines.append(
                f'      {{ season: {rf["season"]}, matches: {rf["matches"]}, '
                f'runs: {rf["runs"]}, wickets: {rf["wickets"]}, '
                f'avg: {ts_val(rf["avg"])}, sr: {ts_val(rf["sr"])}, '
                f'economy: {econ_val}, rating: {rf["rating"]} }},'
            )
        lines.append("    ],")

        # Style tags
        tags_str = ", ".join(f'"{t}"' for t in tags)
        lines.append(f"    styleTags: [{tags_str}],")

        # Hidden values
        lines.append(f"    hiddenTrueValue: {true_val},")

        if hidden:
            lines.append("    hiddenSeasonPerf: {")
            lines.append(f'      projectedRuns: {ts_val(hidden["projectedRuns"])},')
            lines.append(f'      projectedWickets: {ts_val(hidden["projectedWickets"])},')
            lines.append(f'      projectedAvg: {ts_val(hidden["projectedAvg"])},')
            lines.append(f'      projectedSR: {ts_val(hidden["projectedSR"])},')
            lines.append(f'      projectedEconomy: {ts_val(hidden["projectedEconomy"])},')
            lines.append(f'      matchesPlayed: {hidden["matchesPlayed"]},')
            lines.append(f'      overallRating: {hidden["overallRating"]},')
            lines.append(f'      impactScore: {hidden["impactScore"]},')
            lines.append("    },")
        else:
            lines.append("    hiddenSeasonPerf: { matchesPlayed: 0, overallRating: 3, impactScore: 20, projectedRuns: undefined, projectedWickets: undefined, projectedAvg: undefined, projectedSR: undefined, projectedEconomy: undefined },")

        lines.append(f"    isTrap: {ts_val(trap)},")
        lines.append(f"    isSleeper: {ts_val(sleeper)},")
        lines.append("  },")

    lines.append("];")
    lines.append("")

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"\n  Written to {OUT_FILE} ({len(lines)} lines)")


# ═══════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════
def main():
    print("[1/5] Loading auction data...")
    auction = load_auction_data()
    print(f"  {len(auction)} players in auction list")

    print("[2/5] Loading per-year stats...")
    stats = load_stats()
    print(f"  {len(stats)} players in stats CSV")

    print("[3/5] Merging datasets...")
    merged = {}

    for name, years_data in stats.items():
        norm_name = normalize_name(name)
        stat_years = years_data["years"]

        # Need at least 2019+ data (auction is held in 2025)
        recent = [y for y in stat_years if y >= 2019]
        if not recent:
            continue

        # Look up in auction data
        auction_info = auction.get(norm_name) or auction.get(name)

        # Determine role
        if auction_info:
            role = auction_info["role"]
            age = auction_info["age"]
            base_price = auction_info["base_price"]
            is_overseas = auction_info["is_overseas"]
            country = auction_info["country"]
        else:
            # Infer role from stats
            total_wkts = sum(stat_years[y]["wickets"] for y in recent)
            total_runs = sum(stat_years[y]["runs"] for y in recent)
            total_stumpings = sum(stat_years[y]["stumpings"] for y in recent)

            if total_stumpings > 0:
                role = "WICKET_KEEPER"
            elif total_wkts > 15 and total_runs > 100:
                role = "ALL_ROUNDER"
            elif total_wkts > 10:
                role = "BOWLER"
            else:
                role = "BATSMAN"

            age = 28  # default
            is_overseas = name in KNOWN_OVERSEAS
            country = "Overseas" if is_overseas else "India"

            # Compute base price from quality
            avg_runs_pm = total_runs / max(1, sum(stat_years[y]["matches"] for y in recent))
            avg_wkts_pm = total_wkts / max(1, sum(stat_years[y]["matches"] for y in recent))
            quality = avg_runs_pm * 0.3 + avg_wkts_pm * 5

            if quality > 15: base_price = 2.0
            elif quality > 12: base_price = 1.5
            elif quality > 9: base_price = 1.0
            elif quality > 6: base_price = 0.75
            elif quality > 4: base_price = 0.50
            else: base_price = 0.30

        # Compute career stats
        career, recent_form, hidden = compute_career(stat_years)
        if not career or career["matches"] < 3:
            continue

        merged[name] = {
            "role": role,
            "age": age,
            "base_price": base_price,
            "is_overseas": is_overseas,
            "country": country,
            "career": career,
            "recent_form": recent_form or [],
            "hidden": hidden,
            "stat_years": set(stat_years.keys()),
        }

    print(f"  {len(merged)} players merged with stats")

    print(f"[4/5] Selecting top {POOL_SIZE} players...")
    selected = select_players(merged)

    print("[5/5] Generating TypeScript...")
    generate_ts(selected)

    # Summary stats
    prices = [p["base_price"] for _, p in selected]
    print(f"\n  Base price distribution:")
    for tier in IPL_TIERS:
        count = sum(1 for pr in prices if pr == tier)
        if count:
            print(f"    Rs.{tier} Cr: {count} players")


if __name__ == "__main__":
    main()
