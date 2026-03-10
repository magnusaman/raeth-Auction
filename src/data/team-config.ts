import { TeamConfig } from "@/lib/types";

export const TEAMS: TeamConfig[] = [
  {
    index: 0,
    name: "Mumbai Indians",
    shortName: "MI",
    color: "#004BA0",
    logo: "🏏",
    promptAlias: "Storm Breakers",
    promptShort: "STB",
  },
  {
    index: 1,
    name: "Chennai Super Kings",
    shortName: "CSK",
    color: "#FDB913",
    logo: "🦁",
    promptAlias: "Fire Hawks",
    promptShort: "FHK",
  },
  {
    index: 2,
    name: "Royal Challengers",
    shortName: "RCB",
    color: "#EC1C24",
    logo: "👑",
    promptAlias: "Iron Wolves",
    promptShort: "IWL",
  },
  {
    index: 3,
    name: "Kolkata Knight Riders",
    shortName: "KKR",
    color: "#3A225D",
    logo: "⚡",
    promptAlias: "Shadow Kings",
    promptShort: "SDK",
  },
  {
    index: 4,
    name: "Sunrisers Hyderabad",
    shortName: "SRH",
    color: "#FF822A",
    logo: "🌅",
    promptAlias: "Solar Flares",
    promptShort: "SFL",
  },
  {
    index: 5,
    name: "Rajasthan Royals",
    shortName: "RR",
    color: "#EA1A85",
    logo: "🏰",
    promptAlias: "Desert Lions",
    promptShort: "DSL",
  },
  {
    index: 6,
    name: "Delhi Capitals",
    shortName: "DC",
    color: "#004C93",
    logo: "🦅",
    promptAlias: "Thunder Bolts",
    promptShort: "TDB",
  },
  {
    index: 7,
    name: "Punjab Kings",
    shortName: "PBKS",
    color: "#DD1F2D",
    logo: "🗡️",
    promptAlias: "Crimson Tigers",
    promptShort: "CTG",
  },
  {
    index: 8,
    name: "Gujarat Titans",
    shortName: "GT",
    color: "#1C1C2B",
    logo: "🛡️",
    promptAlias: "Dark Knights",
    promptShort: "DKN",
  },
  {
    index: 9,
    name: "Lucknow Super Giants",
    shortName: "LSG",
    color: "#A72056",
    logo: "🦁",
    promptAlias: "Night Riders",
    promptShort: "NRD",
  },
];

export const TEAM_NAMES = TEAMS.map((t) => t.name);

/** Maximum number of teams allowed per auction */
export const MAX_TEAMS = 10;
/** Minimum number of teams for an auction */
export const MIN_TEAMS = 2;
