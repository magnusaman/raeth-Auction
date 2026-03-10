#!/usr/bin/env python3
"""
Process Cricsheet IPL JSON → TypeScript data files for Raeth Arena.

Reads ball-by-ball data for IPL 2022, 2023, 2024.
Computes Dream11 fantasy points per player per match.
Selects top 80 players. Outputs TypeScript data files.

Usage: python3 scripts/process_ipl_data.py
"""

import json, os, glob, math, sys
from collections import defaultdict

# ═══════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data", "raw", "ipl_json")
OUTPUT_DIR = os.path.join(ROOT, "src", "data")

SEASONS_VISIBLE = ["2022", "2023"]  # Default agents see these (for auction)
SEASON_EVAL = "2024"                # Default hidden evaluation season (for auction)
ALL_SEASONS = ["2020", "2021", "2022", "2023", "2024"]  # All seasons to process

# Multi-season eval config: eval season → visible seasons shown to agents
# For tournaments: agents see only prior seasons, evaluated against eval season
SEASON_EVAL_CONFIG = {
    "S1": {"eval": "2021", "visible": ["2020"], "label": "Season 1"},
    "S2": {"eval": "2022", "visible": ["2020", "2021"], "label": "Season 2"},
    "S3": {"eval": "2023", "visible": ["2020", "2021", "2022"], "label": "Season 3"},
    "S4": {"eval": "2024", "visible": ["2020", "2021", "2022", "2023"], "label": "Season 4"},
}

# Map Cricsheet season strings to our canonical season IDs
SEASON_NORMALIZE = {
    "2020/21": "2020",  # IPL 2020 played in UAE
    "2020": "2020",
    "2021": "2021",
    "2022": "2022",
    "2023": "2023",
    "2024": "2024",
}

POOL_SIZE = 120

# Role distribution targets for pool (120 total: ~42 bat, ~33 bowl, ~27 AR, ~18 WK)
ROLE_TARGETS = {"BATSMAN": 42, "BOWLER": 33, "ALL_ROUNDER": 27, "WICKET_KEEPER": 18}

# ═══════════════════════════════════════════════════════════════
# Overseas Players (non-Indian, Cricsheet name format)
# ═══════════════════════════════════════════════════════════════

OVERSEAS = {
    # Australia
    "A Zampa", "AJ Finch", "AJ Turner", "AJ Tye", "C Green", "DA Warner",
    "DR Sams", "GJ Maxwell", "J Fraser-McGurk", "JA Richardson", "JP Behrendorff",
    "MA Starc", "MR Marsh", "MS Wade", "MW Short", "NM Coulter-Nile", "NT Ellis",
    "PJ Cummins", "RP Meredith", "SA Abbott", "SH Johnson", "TM Head",
    # England
    "AS Roy", "BA Stokes", "CJ Jordan", "DJ Willey", "HC Brook", "JC Archer",
    "JC Buttler", "JE Root", "JJ Roy", "JM Bairstow", "L Wood", "LS Livingstone",
    "MA Wood", "MM Ali", "PD Salt", "RJW Topley", "SM Curran", "SW Billings",
    "T Kohler-Cadmore", "TS Mills", "WG Jacks",
    # South Africa
    "A Nortje", "AK Markram", "D Brevis", "D Ferreira", "D Jansen", "D Pretorius",
    "DA Miller", "F du Plessis", "G Coetzee", "H Klaasen", "HE van der Dussen",
    "K Rabada", "KA Maharaj", "KT Maphaka", "LB Williams", "M Jansen", "N Burger",
    "Q de Kock", "RR Rossouw", "SSB Magala", "T Stubbs", "WD Parnell",
    # New Zealand
    "AF Milne", "DP Conway", "DJ Mitchell", "GD Phillips", "JDS Neesham",
    "KS Williamson", "LH Ferguson", "MG Bracewell", "MJ Henry", "MJ Santner",
    "R Ravindra", "TA Boult", "TG Southee", "TL Seifert",
    # West Indies
    "AD Russell", "AJ Hosein", "AS Joseph", "DJ Bravo", "E Lewis", "FA Allen",
    "JO Holder", "KA Pollard", "KR Mayers", "N Pooran", "OC McCoy", "OF Smith",
    "R Powell", "R Shepherd", "S Joseph", "SD Hope", "SE Rutherford", "SO Hetmyer",
    "SP Narine",
    # Afghanistan
    "Azmatullah Omarzai", "Fazalhaq Farooqi", "Gulbadin Naib", "Mohammad Nabi",
    "Naveen-ul-Haq", "Noor Ahmad", "Rahmanullah Gurbaz", "Rashid Khan",
    # Bangladesh
    "Liton Das", "Mustafizur Rahman",
    # Sri Lanka
    "M Pathirana", "M Theekshana", "MD Shanaka", "N Thushara",
    "PBB Rajapaksa", "PVD Chameera", "PWH de Silva",
    # Zimbabwe
    "Sikandar Raza",
    # Ireland
    "J Little", "RJ Gleeson",
    # Singapore/Aus
    "TH David",
    # Namibia
    "D Wiese",
}

# ═══════════════════════════════════════════════════════════════
# Bowling Types
# ═══════════════════════════════════════════════════════════════

PACE_SET = {
    # Indian pace
    "JJ Bumrah", "B Kumar", "Mohammed Shami", "Mohammed Siraj", "Arshdeep Singh",
    "T Natarajan", "Avesh Khan", "Umran Malik", "HV Patel", "Mohsin Khan",
    "Mukesh Choudhary", "Mukesh Kumar", "Akash Deep", "Yash Dayal", "TU Deshpande",
    "Sandeep Sharma", "SN Thakur", "DL Chahar", "I Sharma", "UT Yadav",
    "Kartik Tyagi", "KR Sen", "Basil Thampi", "JD Unadkat", "Navdeep Saini",
    "Simarjeet Singh", "Harshit Rana", "Akash Madhwal", "Yash Thakur", "Rasikh Salam",
    "M Prasidh Krishna", "S Kaul", "C Sakariya", "VG Arora", "Vijaykumar Vyshak",
    "NA Saini", "S Sandeep Warrier", "Akash Singh",
    # Overseas pace
    "K Rabada", "A Nortje", "M Jansen", "PJ Cummins", "JR Hazlewood", "MA Starc",
    "MA Wood", "JC Archer", "TA Boult", "TG Southee", "Fazalhaq Farooqi",
    "Naveen-ul-Haq", "AS Joseph", "DJ Bravo", "OC McCoy", "PVD Chameera",
    "LH Ferguson", "DJ Willey", "AF Milne", "NM Coulter-Nile", "DR Sams",
    "JP Behrendorff", "SA Abbott", "AJ Tye", "CJ Jordan", "JO Holder",
    "J Little", "RJW Topley", "MJ Henry", "WD Parnell", "G Coetzee",
    "KT Maphaka", "D Pretorius", "NT Ellis", "RP Meredith", "JA Richardson",
    "L Wood", "N Thushara", "SSB Magala", "SH Johnson", "N Burger", "S Joseph",
    "R Shepherd", "RJ Gleeson", "D Wiese", "Azmatullah Omarzai",
    "M Pathirana", "Mustafizur Rahman", "Gulbadin Naib", "SM Curran",
    "D Jansen",
}

SPIN_SET = {
    # Indian spin
    "YS Chahal", "R Ashwin", "Kuldeep Yadav", "Ravi Bishnoi", "RA Jadeja",
    "AR Patel", "Washington Sundar", "Shahbaz Ahmed", "MK Lomror", "K Gowtham",
    "M Ashwin", "RD Chahar", "S Gopal", "HR Shokeen", "Mayank Dagar",
    "KV Sharma", "K Kartikeya", "PP Chawla", "M Siddharth", "R Sai Kishore",
    "Swapnil Singh", "Suyash Sharma", "CV Varun", "Harpreet Brar",
    # Overseas spin
    "Rashid Khan", "SP Narine", "M Theekshana", "Noor Ahmad", "A Zampa",
    "MJ Santner", "MM Ali", "PWH de Silva", "Sikandar Raza", "Mohammad Nabi",
    "PBB Rajapaksa", "AJ Hosein", "KA Maharaj", "MG Bracewell",
}

# ═══════════════════════════════════════════════════════════════
# 10-Team Config for TourBench
# ═══════════════════════════════════════════════════════════════

TEAM_CONFIG_FULL = [
    {"index": 0, "name": "Chennai Super Kings", "shortName": "CSK", "color": "#FDB913", "logo": "🦁", "promptAlias": "Fire Hawks", "promptShort": "FHK"},
    {"index": 1, "name": "Mumbai Indians", "shortName": "MI", "color": "#004BA0", "logo": "🏏", "promptAlias": "Storm Breakers", "promptShort": "STB"},
    {"index": 2, "name": "Royal Challengers Bengaluru", "shortName": "RCB", "color": "#EC1C24", "logo": "👑", "promptAlias": "Iron Wolves", "promptShort": "IWL"},
    {"index": 3, "name": "Kolkata Knight Riders", "shortName": "KKR", "color": "#3A225D", "logo": "⚡", "promptAlias": "Shadow Kings", "promptShort": "SDK"},
    {"index": 4, "name": "Sunrisers Hyderabad", "shortName": "SRH", "color": "#FF822A", "logo": "☀️", "promptAlias": "Dawn Raiders", "promptShort": "DRD"},
    {"index": 5, "name": "Rajasthan Royals", "shortName": "RR", "color": "#EA1A85", "logo": "👑", "promptAlias": "Desert Falcons", "promptShort": "DFL"},
    {"index": 6, "name": "Delhi Capitals", "shortName": "DC", "color": "#004C93", "logo": "🦅", "promptAlias": "Capital Chargers", "promptShort": "CCH"},
    {"index": 7, "name": "Punjab Kings", "shortName": "PBKS", "color": "#DD1F2D", "logo": "🦁", "promptAlias": "Red Lancers", "promptShort": "RLC"},
    {"index": 8, "name": "Gujarat Titans", "shortName": "GT", "color": "#1C1C2B", "logo": "🛡️", "promptAlias": "Titan Shields", "promptShort": "TSH"},
    {"index": 9, "name": "Lucknow Super Giants", "shortName": "LSG", "color": "#A72056", "logo": "🦁", "promptAlias": "Crimson Giants", "promptShort": "CGT"},
]

# Normalize team names from Cricsheet variations
TEAM_NAME_MAP = {
    "Royal Challengers Bangalore": "Royal Challengers Bengaluru",
    "Royal Challengers Bengaluru": "Royal Challengers Bengaluru",
    "Chennai Super Kings": "Chennai Super Kings",
    "Mumbai Indians": "Mumbai Indians",
    "Kolkata Knight Riders": "Kolkata Knight Riders",
    "Sunrisers Hyderabad": "Sunrisers Hyderabad",
    "Rajasthan Royals": "Rajasthan Royals",
    "Delhi Capitals": "Delhi Capitals",
    "Punjab Kings": "Punjab Kings",
    "Gujarat Titans": "Gujarat Titans",
    "Lucknow Super Giants": "Lucknow Super Giants",
}


# ═══════════════════════════════════════════════════════════════
# Dream11 T20 Scoring
# ═══════════════════════════════════════════════════════════════

def compute_dream11(s, role):
    """Compute Dream11 fantasy points for one player-match."""
    pts = 4.0  # Playing XI bonus

    # Batting
    runs = s.get("bat_runs", 0)
    bf = s.get("balls_faced", 0)
    fours = s.get("fours", 0)
    sixes = s.get("sixes", 0)
    dismissed = s.get("was_dismissed", False)

    pts += runs
    pts += fours  # boundary bonus
    pts += sixes * 2  # six bonus
    if runs >= 100:
        pts += 16
    elif runs >= 50:
        pts += 8
    # Duck penalty (BAT/AR/WK only, not pure bowlers)
    if runs == 0 and dismissed and role != "BOWLER":
        pts -= 2
    # Strike rate bonus/penalty (min 10 balls)
    if bf >= 10:
        sr = (runs / bf) * 100
        if sr >= 170: pts += 6
        elif sr >= 150: pts += 4
        elif sr >= 130: pts += 2
        elif sr < 50: pts -= 6
        elif sr < 60: pts -= 4
        elif sr < 70: pts -= 2

    # Bowling
    wkts = s.get("wickets_taken", 0)
    overs = s.get("overs_bowled", 0.0)
    rc = s.get("runs_conceded", 0)
    maidens = s.get("maidens", 0)

    pts += wkts * 25
    pts += maidens * 8
    if wkts >= 5:
        pts += 16
    elif wkts >= 4:
        pts += 8
    # Economy (min 2 overs)
    if overs >= 2:
        eco = rc / overs
        if eco < 5: pts += 6
        elif eco < 6: pts += 4
        elif eco < 7: pts += 2
        elif eco > 12: pts -= 6
        elif eco > 11: pts -= 4
        elif eco > 10: pts -= 2

    # Fielding
    pts += s.get("catches", 0) * 8
    pts += s.get("stumpings", 0) * 12
    pts += s.get("run_outs", 0) * 12

    return pts


# ═══════════════════════════════════════════════════════════════
# Match Processing
# ═══════════════════════════════════════════════════════════════

def process_match(filepath):
    """Process one match file. Returns (match_meta, {player_name: stats_dict})."""
    with open(filepath) as f:
        data = json.load(f)

    info = data["info"]
    raw_season = str(info.get("season", ""))
    season = SEASON_NORMALIZE.get(raw_season, raw_season.split("/")[0] if "/" in raw_season else raw_season)

    outcome = info.get("outcome", {})
    # Skip no-result matches
    if "winner" not in outcome:
        return None, None

    teams = info["teams"]
    team1 = TEAM_NAME_MAP.get(teams[0], teams[0])
    team2 = TEAM_NAME_MAP.get(teams[1], teams[1])
    winner = TEAM_NAME_MAP.get(outcome["winner"], outcome["winner"])

    # Margin
    by = outcome.get("by", {})
    if "runs" in by:
        margin = f"{by['runs']} runs"
    elif "wickets" in by:
        margin = f"{by['wickets']} wickets"
    else:
        margin = "Super Over"

    # Build player-to-team mapping
    player_team = {}
    for team_name, players in info.get("players", {}).items():
        norm = TEAM_NAME_MAP.get(team_name, team_name)
        for p in players:
            player_team[p] = norm

    # Initialize per-player stats
    pstats = defaultdict(lambda: {
        "bat_runs": 0, "balls_faced": 0, "fours": 0, "sixes": 0,
        "was_dismissed": False, "batting_positions": [],
        "balls_bowled": 0, "runs_conceded": 0, "wickets_taken": 0,
        "dot_balls_bowled": 0, "overs_bowled": 0.0, "maidens": 0,
        "catches": 0, "stumpings": 0, "run_outs": 0,
        "team": "", "season": season,
    })

    # Mark all players as playing
    for p, t in player_team.items():
        pstats[p]["team"] = t

    innings_scores = []

    # Process only first 2 innings (skip super overs)
    for inn_idx, innings in enumerate(data.get("innings", [])[:2]):
        inn_team = TEAM_NAME_MAP.get(innings["team"], innings["team"])
        total_runs = 0
        total_wickets = 0
        legal_deliveries = 0
        batting_order = []

        for over_data in innings["overs"]:
            over_num = over_data["over"]

            # Track per-bowler stats for this over (maiden detection)
            bowler_over_runs = defaultdict(int)
            bowler_over_legals = defaultdict(int)

            for delivery in over_data["deliveries"]:
                batter = delivery["batter"]
                bowler = delivery["bowler"]
                bat_runs = delivery["runs"]["batter"]
                total_delivery_runs = delivery["runs"]["total"]
                extras = delivery.get("extras", {})
                has_wide = "wides" in extras
                has_noball = "noballs" in extras

                # Track batting order
                if batter not in batting_order:
                    batting_order.append(batter)
                    pstats[batter]["batting_positions"].append(len(batting_order))

                total_runs += total_delivery_runs

                # Batter stats (wides don't count as balls faced)
                if not has_wide:
                    pstats[batter]["balls_faced"] += 1
                    pstats[batter]["bat_runs"] += bat_runs
                    if bat_runs == 4:
                        pstats[batter]["fours"] += 1
                    elif bat_runs == 6:
                        pstats[batter]["sixes"] += 1

                # Bowler stats
                runs_against_bowler = bat_runs
                if has_wide:
                    runs_against_bowler += extras.get("wides", 0)
                if has_noball:
                    runs_against_bowler += extras.get("noballs", 0)
                    # On a no-ball, batter's runs still count but bat_runs
                    # already counted above if not wide
                    if not has_wide:
                        pstats[batter]["bat_runs"] += 0  # already counted

                pstats[bowler]["runs_conceded"] += runs_against_bowler

                is_legal = not has_wide and not has_noball
                if is_legal:
                    pstats[bowler]["balls_bowled"] += 1
                    legal_deliveries += 1
                    bowler_over_legals[bowler] += 1
                    if total_delivery_runs == 0:
                        pstats[bowler]["dot_balls_bowled"] += 1

                bowler_over_runs[bowler] += runs_against_bowler

                # Wickets
                for w in delivery.get("wickets", []):
                    kind = w["kind"]
                    if kind in ("retired hurt", "retired not out", "retired out"):
                        continue
                    total_wickets += 1
                    player_out = w["player_out"]
                    pstats[player_out]["was_dismissed"] = True

                    # Bowler gets wicket credit (except run outs)
                    if kind not in ("run out",):
                        pstats[bowler]["wickets_taken"] += 1

                    # Fielding credits
                    for fielder in w.get("fielders", []):
                        fname = fielder.get("name", "")
                        if not fname:
                            continue
                        if kind == "caught":
                            pstats[fname]["catches"] += 1
                        elif kind == "stumped":
                            pstats[fname]["stumpings"] += 1
                        elif kind == "run out":
                            pstats[fname]["run_outs"] += 1

            # Check for maiden overs
            for bwlr, runs in bowler_over_runs.items():
                if bowler_over_legals[bwlr] == 6 and runs == 0:
                    pstats[bwlr]["maidens"] += 1

        # Format innings score
        ov_complete = legal_deliveries // 6
        ov_remain = legal_deliveries % 6
        if ov_remain == 0:
            ov_str = str(ov_complete)
        else:
            ov_str = f"{ov_complete}.{ov_remain}"
        innings_scores.append(f"{total_runs}/{total_wickets} ({ov_str})")

    # Compute overs bowled per bowler (after all innings processed)
    for p in pstats:
        bb = pstats[p]["balls_bowled"]
        if bb > 0:
            pstats[p]["overs_bowled"] = bb / 6.0

    # Map innings to teams
    inn_teams = [TEAM_NAME_MAP.get(inn["team"], inn["team"]) for inn in data.get("innings", [])[:2]]
    t1_score = ""
    t2_score = ""
    for i, it in enumerate(inn_teams):
        if i < len(innings_scores):
            if it == team1:
                t1_score = innings_scores[i]
            elif it == team2:
                t2_score = innings_scores[i]

    match_meta = {
        "match_number": info.get("event", {}).get("match_number", 0),
        "date": info.get("dates", [""])[0],
        "team1": team1,
        "team2": team2,
        "venue": info.get("venue", ""),
        "winner": winner,
        "margin": margin,
        "team1_score": t1_score,
        "team2_score": t2_score,
        "season": season,
    }

    return match_meta, dict(pstats)


# ═══════════════════════════════════════════════════════════════
# Aggregation & Role Classification
# ═══════════════════════════════════════════════════════════════

def aggregate_players(all_match_data):
    """
    Aggregate per-player per-match stats into season and career summaries.
    Returns dict: player_name -> {seasons: {}, career: {}, ...}
    """
    # player -> season -> list of match stats
    player_seasons = defaultdict(lambda: defaultdict(list))
    # player -> set of teams
    player_teams = defaultdict(set)

    for match_meta, pstats in all_match_data:
        season = match_meta["season"]
        for pname, stats in pstats.items():
            player_seasons[pname][season].append(stats)
            if stats["team"]:
                player_teams[pname].add(stats["team"])

    players = {}
    for pname, seasons_data in player_seasons.items():
        # Need at least 3 matches total across all seasons
        total_matches = sum(len(ms) for ms in seasons_data.values())
        if total_matches < 3:
            continue

        # Determine role first (needed for Dream11 duck penalty)
        career_bat_runs = 0
        career_balls_bowled = 0
        career_wickets = 0
        career_stumpings = 0
        career_bat_innings = 0

        for season, matches in seasons_data.items():
            for s in matches:
                career_bat_runs += s["bat_runs"]
                career_balls_bowled += s["balls_bowled"]
                career_wickets += s["wickets_taken"]
                career_stumpings += s["stumpings"]
                if s["balls_faced"] > 0 or s["was_dismissed"]:
                    career_bat_innings += 1

        # Role classification
        if career_stumpings >= 2:
            role = "WICKET_KEEPER"
        elif career_balls_bowled < 30 and career_bat_runs > 50:
            role = "BATSMAN"
        elif career_balls_bowled >= 30 and career_bat_runs < 50:
            role = "BOWLER"
        elif career_balls_bowled >= 60 and career_bat_runs >= 100:
            role = "ALL_ROUNDER"
        elif career_balls_bowled >= 30 and career_bat_runs >= 50:
            role = "ALL_ROUNDER"
        elif career_balls_bowled >= 60:
            role = "BOWLER"
        else:
            role = "BATSMAN"

        # Compute Dream11 per match and aggregate by season
        season_summaries = {}
        all_dream11 = []
        all_positions = []

        for season in ALL_SEASONS:
            matches = seasons_data.get(season, [])
            if not matches:
                continue
            d11_pts = []
            s_runs = 0
            s_wickets = 0
            s_bf = 0
            s_fours = 0
            s_sixes = 0
            s_dismissals = 0
            s_innings = 0
            s_bb = 0
            s_rc = 0
            s_catches = 0
            s_stumpings = 0
            s_dots_bowled = 0
            s_maidens = 0
            s_fifties = 0
            s_hundreds = 0

            for ms in matches:
                pts = compute_dream11(ms, role)
                d11_pts.append(pts)
                all_dream11.append((season, pts))

                s_runs += ms["bat_runs"]
                s_wickets += ms["wickets_taken"]
                s_bf += ms["balls_faced"]
                s_fours += ms["fours"]
                s_sixes += ms["sixes"]
                s_bb += ms["balls_bowled"]
                s_rc += ms["runs_conceded"]
                s_catches += ms["catches"]
                s_stumpings += ms["stumpings"]
                s_maidens += ms["maidens"]
                s_dots_bowled += ms["dot_balls_bowled"]
                if ms["was_dismissed"]:
                    s_dismissals += 1
                if ms["balls_faced"] > 0 or ms["was_dismissed"]:
                    s_innings += 1
                if ms["bat_runs"] >= 100:
                    s_hundreds += 1
                elif ms["bat_runs"] >= 50:
                    s_fifties += 1
                all_positions.extend(ms.get("batting_positions", []))

            avg_d11 = sum(d11_pts) / len(d11_pts) if d11_pts else 0
            bat_avg = s_runs / max(s_dismissals, 1)
            sr = (s_runs / s_bf * 100) if s_bf > 0 else 0
            eco = (s_rc / (s_bb / 6)) if s_bb >= 6 else 0
            bowl_sr = (s_bb / s_wickets) if s_wickets > 0 else 0
            bowl_avg = (s_rc / s_wickets) if s_wickets > 0 else 0
            boundary_pct = ((s_fours * 4 + s_sixes * 6) / s_runs * 100) if s_runs > 0 else 0
            dot_pct_bowl = (s_dots_bowled / s_bb * 100) if s_bb > 0 else 0

            season_summaries[season] = {
                "matches": len(matches),
                "innings": s_innings,
                "runs": s_runs,
                "bat_avg": round(bat_avg, 2),
                "sr": round(sr, 2),
                "fifties": s_fifties,
                "hundreds": s_hundreds,
                "boundary_pct": round(boundary_pct, 1),
                "wickets": s_wickets,
                "bowl_avg": round(bowl_avg, 2),
                "economy": round(eco, 2),
                "bowl_sr": round(bowl_sr, 1),
                "dot_pct_bowl": round(dot_pct_bowl, 1),
                "catches": s_catches,
                "stumpings": s_stumpings,
                "maidens": s_maidens,
                "dream11_avg": round(avg_d11, 1),
                "dream11_total": round(sum(d11_pts), 1),
            }

        # Career stats = 2022 + 2023 combined
        career = {"matches": 0, "innings": 0, "runs": 0, "wickets": 0,
                  "bat_avg": 0, "sr": 0, "fifties": 0, "hundreds": 0,
                  "boundary_pct": 0, "economy": 0, "bowl_avg": 0,
                  "bowl_sr": 0, "dot_pct_bowl": 0,
                  "catches": 0, "stumpings": 0, "maidens": 0,
                  "bf": 0, "dismissals": 0, "bb": 0, "rc": 0, "dots": 0}

        for sv in SEASONS_VISIBLE:
            if sv in season_summaries:
                ss = season_summaries[sv]
                career["matches"] += ss["matches"]
                career["innings"] += ss["innings"]
                career["runs"] += ss["runs"]
                career["wickets"] += ss["wickets"]
                career["fifties"] += ss["fifties"]
                career["hundreds"] += ss["hundreds"]
                career["catches"] += ss["catches"]
                career["stumpings"] += ss["stumpings"]
                career["maidens"] += ss["maidens"]
            # Re-aggregate raw for accurate averages
            for ms in seasons_data.get(sv, []):
                career["bf"] += ms["balls_faced"]
                career["bb"] += ms["balls_bowled"]
                career["rc"] += ms["runs_conceded"]
                career["dots"] += ms["dot_balls_bowled"]
                if ms["was_dismissed"]:
                    career["dismissals"] += 1

        if career["dismissals"] > 0:
            career["bat_avg"] = round(career["runs"] / career["dismissals"], 2)
        if career["bf"] > 0:
            career["sr"] = round(career["runs"] / career["bf"] * 100, 2)
        if career["bb"] >= 6:
            career["economy"] = round(career["rc"] / (career["bb"] / 6), 2)
        if career["wickets"] > 0:
            career["bowl_avg"] = round(career["rc"] / career["wickets"], 2)
            career["bowl_sr"] = round(career["bb"] / career["wickets"], 1)
        if career["runs"] > 0:
            career["boundary_pct"] = round(
                sum(ms["fours"] * 4 + ms["sixes"] * 6
                    for sv in SEASONS_VISIBLE for ms in seasons_data.get(sv, []))
                / career["runs"] * 100, 1)
        if career["bb"] > 0:
            career["dot_pct_bowl"] = round(career["dots"] / career["bb"] * 100, 1)

        # Dream11 averages
        visible_d11 = [pts for (s, pts) in all_dream11 if s in SEASONS_VISIBLE]
        eval_d11 = [pts for (s, pts) in all_dream11 if s == SEASON_EVAL]
        career_d11_avg = sum(visible_d11) / len(visible_d11) if visible_d11 else 0
        eval_d11_avg = sum(eval_d11) / len(eval_d11) if eval_d11 else 0

        # Average batting position
        avg_pos = sum(all_positions) / len(all_positions) if all_positions else 5

        # Most recent team (2024 > 2023 > 2022)
        latest_team = ""
        for s in reversed(ALL_SEASONS):
            for ms in seasons_data.get(s, []):
                if ms["team"]:
                    latest_team = ms["team"]
                    break
            if latest_team:
                break

        players[pname] = {
            "role": role,
            "seasons": season_summaries,
            "career": career,
            "career_d11_avg": round(career_d11_avg, 1),
            "eval_d11_avg": round(eval_d11_avg, 1),
            "avg_batting_pos": round(avg_pos, 1),
            "total_matches": total_matches,
            "latest_team": latest_team,
            "is_overseas": pname in OVERSEAS,
        }

    return players


def classify_subtype(pname, pdata):
    """Classify player subtype based on stats and manual mappings."""
    role = pdata["role"]
    career = pdata["career"]
    avg_pos = pdata["avg_batting_pos"]
    sr = career["sr"]
    bat_avg = career["bat_avg"]

    if role == "BATSMAN":
        if avg_pos <= 2.5 and sr > 135:
            return "powerplay_hitter"
        elif avg_pos <= 3.5 and sr < 135:
            return "anchor"
        elif avg_pos >= 5 and sr > 140:
            return "finisher"
        elif sr > 140:
            return "powerplay_hitter"
        else:
            return "accumulator"
    elif role == "BOWLER":
        if pname in SPIN_SET:
            return "spin_wizard"
        elif pname in PACE_SET:
            # Check if death bowler (heuristic: high economy but lots of wickets)
            eco = career.get("economy", 0)
            if eco > 8.5:
                return "death_bowler"
            return "pace_ace"
        else:
            return "medium_pace"
    elif role == "ALL_ROUNDER":
        # Determine if batting or bowling all-rounder
        runs_per_match = career["runs"] / max(career["matches"], 1)
        wkts_per_match = career["wickets"] / max(career["matches"], 1)
        if runs_per_match > 20 and wkts_per_match < 0.8:
            return "batting_allrounder"
        elif wkts_per_match > 1 and runs_per_match < 15:
            return "bowling_allrounder"
        elif runs_per_match >= wkts_per_match * 15:
            return "batting_allrounder"
        else:
            return "bowling_allrounder"
    elif role == "WICKET_KEEPER":
        if bat_avg > 25:
            return "keeper_batsman"
        else:
            return "keeper_specialist"

    return "accumulator"


def generate_style_tags(pname, pdata):
    """Generate style tags based on stats patterns."""
    tags = []
    career = pdata["career"]
    sr = career["sr"]
    avg = career["bat_avg"]
    eco = career.get("economy", 0)
    role = pdata["role"]

    if role in ("BATSMAN", "WICKET_KEEPER", "ALL_ROUNDER"):
        if sr > 160:
            tags.append("explosive_hitter")
        elif sr > 140:
            tags.append("aggressive_batsman")
        if avg > 40:
            tags.append("consistent_scorer")
        if career.get("boundary_pct", 0) > 65:
            tags.append("boundary_heavy")
        if pdata["avg_batting_pos"] <= 2:
            tags.append("opener")
        elif pdata["avg_batting_pos"] >= 6:
            tags.append("lower_order_hitter")

    if role in ("BOWLER", "ALL_ROUNDER"):
        if eco < 7 and career["bb"] >= 60:
            tags.append("economical")
        if career.get("dot_pct_bowl", 0) > 45:
            tags.append("dot_ball_specialist")
        wpm = career["wickets"] / max(career["matches"], 1)
        if wpm > 1.5:
            tags.append("wicket_taker")
        if pname in PACE_SET:
            tags.append("pace")
        elif pname in SPIN_SET:
            tags.append("spin")

    if career.get("catches", 0) > 10:
        tags.append("athletic_fielder")

    # Check form trend
    s22 = pdata["seasons"].get("2022", {}).get("dream11_avg", 0)
    s23 = pdata["seasons"].get("2023", {}).get("dream11_avg", 0)
    if s23 > s22 * 1.3 and s22 > 0:
        tags.append("improving_form")
    elif s23 < s22 * 0.7 and s22 > 0:
        tags.append("declining_form")

    return tags[:5]  # Max 5 tags


# ═══════════════════════════════════════════════════════════════
# Player Pool Selection
# ═══════════════════════════════════════════════════════════════

def select_pool(players):
    """Select top 80 players, role-balanced."""
    # Must have played in at least one visible season AND in 2024 (eval season)
    eligible = {n: p for n, p in players.items()
                if any(s in p["seasons"] for s in SEASONS_VISIBLE)
                and SEASON_EVAL in p["seasons"]}

    # Sort by career Dream11 avg (what agents would value them at)
    by_role = defaultdict(list)
    for name, pdata in eligible.items():
        by_role[pdata["role"]].append((name, pdata))

    for role in by_role:
        by_role[role].sort(key=lambda x: x[1]["career_d11_avg"], reverse=True)

    selected = []
    # Fill each role up to target
    for role, target in ROLE_TARGETS.items():
        available = by_role.get(role, [])
        for name, pdata in available[:target]:
            selected.append((name, pdata))

    # If we have fewer than 80, fill with best remaining
    selected_names = {n for n, _ in selected}
    remaining = [(n, p) for n, p in eligible.items() if n not in selected_names]
    remaining.sort(key=lambda x: x[1]["career_d11_avg"], reverse=True)
    while len(selected) < POOL_SIZE and remaining:
        selected.append(remaining.pop(0))

    # Trim to exactly 80 if over
    selected = selected[:POOL_SIZE]
    return selected


# ═══════════════════════════════════════════════════════════════
# TypeScript Generation
# ═══════════════════════════════════════════════════════════════

def to_ts_val(v):
    """Convert Python value to TypeScript literal."""
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


def generate_players_ts(selected_players):
    """Generate src/data/ipl-players.ts"""
    lines = [
        '// Auto-generated by scripts/process_ipl_data.py — DO NOT EDIT',
        '// Source: Cricsheet.org IPL ball-by-ball data (2022-2024)',
        '',
        'import { SyntheticPlayer } from "@/lib/types";',
        '',
        'export const IPL_PLAYERS: SyntheticPlayer[] = [',
    ]

    for name, pdata in selected_players:
        role = pdata["role"]
        subtype = classify_subtype(name, pdata)
        tags = generate_style_tags(name, pdata)
        career = pdata["career"]

        # Base price from career Dream11 avg (IPL rules: max ₹2 Cr)
        # Real IPL base price tiers: 0.20, 0.30, 0.40, 0.50, 0.75, 1.00, 1.50, 2.00
        career_d11 = pdata["career_d11_avg"]
        raw_value = (career_d11 / 50) * 15 * 0.7  # raw performance value
        # Map to IPL base price tiers (capped at ₹2 Cr)
        ipl_tiers = [0.20, 0.30, 0.40, 0.50, 0.75, 1.00, 1.50, 2.00]
        # Scale raw value into tier range: top performers get ₹2 Cr, average get ₹0.50
        tier_index = min(len(ipl_tiers) - 1, int((raw_value / 15) * len(ipl_tiers)))
        base_price = ipl_tiers[tier_index]

        # Hidden true value from 2024 Dream11 avg
        eval_d11 = pdata["eval_d11_avg"]
        hidden_true_value = round((eval_d11 / 50) * 15, 1)

        # Trap/Sleeper detection
        is_trap = career_d11 > 30 and eval_d11 < career_d11 * 0.6
        is_sleeper = career_d11 < 25 and eval_d11 > career_d11 * 1.5 and eval_d11 > 25

        # Age estimate based on earliest season
        if "2022" in pdata["seasons"]:
            age = 30
        elif "2023" in pdata["seasons"]:
            age = 26
        else:
            age = 23

        nationality = "Overseas" if pdata["is_overseas"] else "India"

        # Recent form (2022 and 2023)
        recent_form = []
        for i, sv in enumerate(SEASONS_VISIBLE, 1):
            if sv in pdata["seasons"]:
                ss = pdata["seasons"][sv]
                d11 = ss["dream11_avg"]
                rating = min(10, max(1, round(d11 / 5)))
                recent_form.append({
                    "season": i,
                    "matches": ss["matches"],
                    "runs": ss["runs"],
                    "wickets": ss["wickets"],
                    "avg": ss["bat_avg"],
                    "sr": ss["sr"],
                    "economy": ss["economy"] if ss["economy"] > 0 else None,
                    "rating": rating,
                })

        # Hidden season perf (2024)
        eval_ss = pdata["seasons"].get(SEASON_EVAL, {})
        if eval_ss:
            hidden_perf = {
                "projectedRuns": eval_ss.get("runs", 0),
                "projectedWickets": eval_ss.get("wickets", 0),
                "projectedAvg": eval_ss.get("bat_avg", 0),
                "projectedSR": eval_ss.get("sr", 0),
                "projectedEconomy": eval_ss.get("economy", 0) or None,
                "matchesPlayed": eval_ss.get("matches", 0),
                "overallRating": min(10, max(1, round(eval_d11 / 5))),
                "impactScore": min(100, round(eval_d11 * 2)),
            }
        else:
            hidden_perf = {
                "projectedRuns": 0, "projectedWickets": 0,
                "projectedAvg": 0, "projectedSR": 0, "projectedEconomy": None,
                "matchesPlayed": 0, "overallRating": 1, "impactScore": 0,
            }

        # Format the player object
        lines.append('  {')
        lines.append(f'    name: {to_ts_val(name)},')
        lines.append(f'    nationality: {to_ts_val(nationality)},')
        lines.append(f'    age: {age},')
        lines.append(f'    role: {to_ts_val(role)},')
        lines.append(f'    subType: {to_ts_val(subtype)},')
        lines.append(f'    basePrice: {base_price},')

        # Career stats
        lines.append('    careerStats: {')
        lines.append(f'      matches: {career["matches"]},')
        lines.append(f'      innings: {career["innings"]},')
        if role in ("BATSMAN", "ALL_ROUNDER", "WICKET_KEEPER"):
            lines.append(f'      runs: {career["runs"]},')
            lines.append(f'      battingAvg: {career["bat_avg"]},')
            lines.append(f'      strikeRate: {career["sr"]},')
            lines.append(f'      fifties: {career["fifties"]},')
            lines.append(f'      hundreds: {career["hundreds"]},')
            lines.append(f'      boundaryPct: {career["boundary_pct"]},')
        if role in ("BOWLER", "ALL_ROUNDER"):
            lines.append(f'      wickets: {career["wickets"]},')
            lines.append(f'      bowlingAvg: {career["bowl_avg"]},')
            lines.append(f'      economy: {career["economy"]},')
            lines.append(f'      bowlingStrikeRate: {career["bowl_sr"]},')
            lines.append(f'      dotBallPct: {career["dot_pct_bowl"]},')
        if career["catches"] > 0:
            lines.append(f'      catches: {career["catches"]},')
        if career["stumpings"] > 0:
            lines.append(f'      stumpings: {career["stumpings"]},')
        lines.append('    },')

        # Recent form
        lines.append('    recentForm: [')
        for rf in recent_form:
            eco_str = to_ts_val(rf["economy"])
            lines.append(f'      {{ season: {rf["season"]}, matches: {rf["matches"]}, '
                         f'runs: {rf["runs"]}, wickets: {rf["wickets"]}, '
                         f'avg: {rf["avg"]}, sr: {rf["sr"]}, '
                         f'economy: {eco_str}, rating: {rf["rating"]} }},')
        lines.append('    ],')

        # Style tags
        tags_str = ", ".join(f'"{t}"' for t in tags)
        lines.append(f'    styleTags: [{tags_str}],')

        # Hidden values
        lines.append(f'    hiddenTrueValue: {hidden_true_value},')

        # Hidden season perf
        lines.append('    hiddenSeasonPerf: {')
        lines.append(f'      projectedRuns: {hidden_perf["projectedRuns"]},')
        lines.append(f'      projectedWickets: {hidden_perf["projectedWickets"]},')
        lines.append(f'      projectedAvg: {hidden_perf["projectedAvg"]},')
        lines.append(f'      projectedSR: {hidden_perf["projectedSR"]},')
        lines.append(f'      projectedEconomy: {to_ts_val(hidden_perf["projectedEconomy"])},')
        lines.append(f'      matchesPlayed: {hidden_perf["matchesPlayed"]},')
        lines.append(f'      overallRating: {hidden_perf["overallRating"]},')
        lines.append(f'      impactScore: {hidden_perf["impactScore"]},')
        lines.append('    },')

        lines.append(f'    isTrap: {to_ts_val(is_trap)},')
        lines.append(f'    isSleeper: {to_ts_val(is_sleeper)},')
        lines.append('  },')

    lines.append('];')
    lines.append('')

    outpath = os.path.join(OUTPUT_DIR, "ipl-players.ts")
    with open(outpath, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"  Written {outpath} ({len(selected_players)} players)")


def generate_matches_ts(all_match_data):
    """Generate src/data/ipl-matches.ts with all IPL 2024 match results."""
    matches_2024 = [m for m, _ in all_match_data if m["season"] == SEASON_EVAL]
    matches_2024.sort(key=lambda m: (m["date"], m["match_number"]))

    lines = [
        '// Auto-generated by scripts/process_ipl_data.py — DO NOT EDIT',
        '// Source: Cricsheet.org IPL 2024 ball-by-ball data',
        '',
        'export interface IPLMatchResult {',
        '  matchNumber: number;',
        '  date: string;',
        '  team1: string;',
        '  team2: string;',
        '  venue: string;',
        '  winner: string;',
        '  margin: string;',
        '  team1Score: string;',
        '  team2Score: string;',
        '}',
        '',
        'export const IPL_2024_MATCHES: IPLMatchResult[] = [',
    ]

    for m in matches_2024:
        lines.append('  {')
        lines.append(f'    matchNumber: {m["match_number"]},')
        lines.append(f'    date: {to_ts_val(m["date"])},')
        lines.append(f'    team1: {to_ts_val(m["team1"])},')
        lines.append(f'    team2: {to_ts_val(m["team2"])},')
        lines.append(f'    venue: {to_ts_val(m["venue"])},')
        lines.append(f'    winner: {to_ts_val(m["winner"])},')
        lines.append(f'    margin: {to_ts_val(m["margin"])},')
        lines.append(f'    team1Score: {to_ts_val(m["team1_score"])},')
        lines.append(f'    team2Score: {to_ts_val(m["team2_score"])},')
        lines.append('  },')

    lines.append('];')
    lines.append('')

    # Also export team list
    lines.append('export const IPL_2024_TEAMS = [')
    for tc in TEAM_CONFIG_FULL:
        lines.append(f'  {to_ts_val(tc["name"])},')
    lines.append('];')
    lines.append('')

    outpath = os.path.join(OUTPUT_DIR, "ipl-matches.ts")
    with open(outpath, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"  Written {outpath} ({len(matches_2024)} matches)")


def generate_seasons_ts(all_match_data):
    """Generate src/data/ipl-seasons.ts with match results for all eval seasons (S1-S4)."""
    lines = [
        '// Auto-generated by scripts/process_ipl_data.py — DO NOT EDIT',
        '// Match results for multi-season tournament evaluation',
        '',
        'import { IPLMatchResult } from "./ipl-matches";',
        '',
        '// Season config: which seasons agents can see for each eval target',
        'export const SEASON_CONFIG = {',
    ]

    for sid, cfg in SEASON_EVAL_CONFIG.items():
        lines.append(f'  {sid}: {{ eval: "{cfg["eval"]}", visible: {json.dumps(cfg["visible"])}, label: "{cfg["label"]}" }},')
    lines.append('} as const;')
    lines.append('')
    lines.append('export type SeasonId = keyof typeof SEASON_CONFIG;')
    lines.append('')

    # Generate match arrays for each eval season
    for sid, cfg in SEASON_EVAL_CONFIG.items():
        eval_year = cfg["eval"]
        season_matches = [m for m, _ in all_match_data if m["season"] == eval_year]
        season_matches.sort(key=lambda m: (m["date"], m.get("match_number", 0)))

        lines.append(f'// {cfg["label"]}: Evaluate against {eval_year} results (agents see {", ".join(cfg["visible"])})')
        lines.append(f'export const MATCHES_{sid}: IPLMatchResult[] = [')

        for i, m in enumerate(season_matches, 1):
            lines.append('  {')
            lines.append(f'    matchNumber: {i},')
            lines.append(f'    date: {to_ts_val(m["date"])},')
            lines.append(f'    team1: {to_ts_val(m["team1"])},')
            lines.append(f'    team2: {to_ts_val(m["team2"])},')
            lines.append(f'    venue: {to_ts_val(m["venue"])},')
            lines.append(f'    winner: {to_ts_val(m["winner"])},')
            lines.append(f'    margin: {to_ts_val(m["margin"])},')
            lines.append(f'    team1Score: {to_ts_val(m.get("team1_score", ""))},')
            lines.append(f'    team2Score: {to_ts_val(m.get("team2_score", ""))},')
            lines.append('  },')

        lines.append('];')
        lines.append('')

        print(f"    {sid} ({cfg['label']}): {len(season_matches)} matches from {eval_year}")

    # Also export matches by year (needed for visible history lookups)
    all_years = sorted(set(m["season"] for m, _ in all_match_data))
    for year in all_years:
        # Skip years that already have a MATCHES_S* export (avoid duplication)
        is_eval_year = any(cfg["eval"] == year for cfg in SEASON_EVAL_CONFIG.values())
        if is_eval_year:
            continue

        year_matches = [m for m, _ in all_match_data if m["season"] == year]
        year_matches.sort(key=lambda m: (m["date"], m.get("match_number", 0)))

        lines.append(f'// Year {year} matches (visible history only, not an eval season)')
        lines.append(f'export const MATCHES_{year}: IPLMatchResult[] = [')
        for i, m in enumerate(year_matches, 1):
            lines.append('  {')
            lines.append(f'    matchNumber: {i},')
            lines.append(f'    date: {to_ts_val(m["date"])},')
            lines.append(f'    team1: {to_ts_val(m["team1"])},')
            lines.append(f'    team2: {to_ts_val(m["team2"])},')
            lines.append(f'    venue: {to_ts_val(m["venue"])},')
            lines.append(f'    winner: {to_ts_val(m["winner"])},')
            lines.append(f'    margin: {to_ts_val(m["margin"])},')
            lines.append(f'    team1Score: {to_ts_val(m.get("team1_score", ""))},')
            lines.append(f'    team2Score: {to_ts_val(m.get("team2_score", ""))},')
            lines.append('  },')
        lines.append('];')
        lines.append('')
        print(f"    Year {year}: {len(year_matches)} matches (visible history)")

    # Lookup map — eval seasons
    lines.append('export const SEASON_MATCHES: Record<string, IPLMatchResult[]> = {')
    for sid in SEASON_EVAL_CONFIG:
        lines.append(f'  {sid}: MATCHES_{sid},')
    lines.append('};')
    lines.append('')

    # Lookup map — all years (for visible history)
    lines.append('export const MATCHES_BY_YEAR: Record<string, IPLMatchResult[]> = {')
    for year in all_years:
        # Find which array to reference
        eval_sid = None
        for sid, cfg in SEASON_EVAL_CONFIG.items():
            if cfg["eval"] == year:
                eval_sid = sid
                break
        if eval_sid:
            lines.append(f'  "{year}": MATCHES_{eval_sid},')
        else:
            lines.append(f'  "{year}": MATCHES_{year},')
    lines.append('};')
    lines.append('')

    outpath = os.path.join(OUTPUT_DIR, "ipl-seasons.ts")
    with open(outpath, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"  Written {outpath}")


def generate_team_config_ts():
    """Generate src/data/team-config-full.ts with all 10 IPL teams."""
    lines = [
        '// Auto-generated by scripts/process_ipl_data.py — DO NOT EDIT',
        '',
        'import { TeamConfig } from "@/lib/types";',
        '',
        'export const TEAMS_FULL: TeamConfig[] = [',
    ]
    for tc in TEAM_CONFIG_FULL:
        lines.append('  {')
        lines.append(f'    index: {tc["index"]},')
        lines.append(f'    name: {to_ts_val(tc["name"])},')
        lines.append(f'    shortName: {to_ts_val(tc["shortName"])},')
        lines.append(f'    color: {to_ts_val(tc["color"])},')
        lines.append(f'    logo: {to_ts_val(tc["logo"])},')
        lines.append(f'    promptAlias: {to_ts_val(tc["promptAlias"])},')
        lines.append(f'    promptShort: {to_ts_val(tc["promptShort"])},')
        lines.append('  },')
    lines.append('];')
    lines.append('')
    lines.append('export const TEAM_NAMES_FULL = TEAMS_FULL.map((t) => t.name);')
    lines.append('')

    outpath = os.path.join(OUTPUT_DIR, "team-config-full.ts")
    with open(outpath, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"  Written {outpath} ({len(TEAM_CONFIG_FULL)} teams)")


# ═══════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════

def main():
    print("=" * 60)
    print("Raeth Arena — IPL Data Processing Pipeline")
    print("=" * 60)

    # 1. Find and process all match files
    print(f"\n[1/6] Loading matches from {DATA_DIR}...")
    files = sorted(glob.glob(os.path.join(DATA_DIR, "*.json")))
    print(f"  Found {len(files)} total match files")

    all_match_data = []
    skipped = 0
    season_counts = defaultdict(int)

    for filepath in files:
        with open(filepath) as f:
            data = json.load(f)
        raw_season = str(data["info"].get("season", ""))
        season = SEASON_NORMALIZE.get(raw_season, raw_season.split("/")[0] if "/" in raw_season else raw_season)
        if season not in ALL_SEASONS:
            continue

        match_meta, pstats = process_match(filepath)
        if match_meta is None:
            skipped += 1
            continue
        all_match_data.append((match_meta, pstats))
        season_counts[season] += 1

    print(f"  Processed: {dict(season_counts)} = {sum(season_counts.values())} matches ({skipped} skipped)")

    # 2. Aggregate player data
    print("\n[2/6] Aggregating player stats...")
    players = aggregate_players(all_match_data)
    print(f"  {len(players)} players with 3+ matches")

    # Count roles
    role_counts = defaultdict(int)
    for p in players.values():
        role_counts[p["role"]] += 1
    print(f"  Roles: {dict(role_counts)}")

    # 3. Select top 80
    print(f"\n[3/6] Selecting top {POOL_SIZE} players...")
    selected = select_pool(players)
    sel_roles = defaultdict(int)
    for n, p in selected:
        sel_roles[p["role"]] += 1
    print(f"  Selected: {dict(sel_roles)}")

    # Show top 10
    print("\n  Top 10 by career Dream11 avg:")
    top10 = sorted(selected, key=lambda x: x[1]["career_d11_avg"], reverse=True)[:10]
    for i, (name, pdata) in enumerate(top10, 1):
        d11 = pdata["career_d11_avg"]
        eval_d11 = pdata["eval_d11_avg"]
        print(f"    {i:2}. {name:<25} {pdata['role']:<15} D11: {d11:5.1f} (2024: {eval_d11:5.1f})")

    # Show traps and sleepers
    traps = [(n, p) for n, p in selected if p["career_d11_avg"] > 30 and p["eval_d11_avg"] < p["career_d11_avg"] * 0.6]
    sleepers = [(n, p) for n, p in selected if p["career_d11_avg"] < 25 and p["eval_d11_avg"] > p["career_d11_avg"] * 1.5 and p["eval_d11_avg"] > 25]
    if traps:
        print(f"\n  Traps ({len(traps)}):")
        for n, p in traps[:5]:
            print(f"    - {n}: career={p['career_d11_avg']:.1f} -> 2024={p['eval_d11_avg']:.1f}")
    if sleepers:
        print(f"\n  Sleepers ({len(sleepers)}):")
        for n, p in sleepers[:5]:
            print(f"    - {n}: career={p['career_d11_avg']:.1f} -> 2024={p['eval_d11_avg']:.1f}")

    # 4. Generate TypeScript files
    print("\n[4/6] Generating ipl-players.ts...")
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    generate_players_ts(selected)

    print("\n[5/7] Generating ipl-matches.ts...")
    generate_matches_ts(all_match_data)

    print("\n[6/7] Generating ipl-seasons.ts (multi-season S1-S4)...")
    generate_seasons_ts(all_match_data)

    print("\n[7/7] Generating team-config-full.ts...")
    generate_team_config_ts()

    print("\n" + "=" * 60)
    print("Done! Generated files in src/data/")
    print("=" * 60)


if __name__ == "__main__":
    main()
