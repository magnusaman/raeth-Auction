export interface Venue {
  name: string;
  city: string;
  homeTeamIndex: number | null; // null for neutral
  traits: VenueTraits;
}

export interface VenueTraits {
  paceAdvantage: number;   // -1 (spin heaven) to +1 (pace paradise)
  battingFriendly: number; // 0 (bowler paradise) to 1 (run fest)
  groundSize: number;      // 0 (small) to 1 (huge)
  dewFactor: number;       // 0 (none) to 1 (heavy dew in 2nd innings)
  spinLater: number;       // 0 (no) to 1 (deteriorates badly)
  avgFirstInnings: number; // typical first innings score
  description: string;
}

export const VENUES: Venue[] = [
  {
    name: "Wankhede Stadium",
    city: "Mumbai",
    homeTeamIndex: 0, // MI
    traits: {
      paceAdvantage: 0.4,
      battingFriendly: 0.8,
      groundSize: 0.4,
      dewFactor: 0.7,
      spinLater: 0.2,
      avgFirstInnings: 175,
      description: "Batting paradise with dew in second innings. Pace bowlers get early movement. Small boundaries favor big hitters.",
    },
  },
  {
    name: "MA Chidambaram Stadium",
    city: "Chennai",
    homeTeamIndex: 1, // CSK
    traits: {
      paceAdvantage: -0.5,
      battingFriendly: 0.3,
      groundSize: 0.6,
      dewFactor: 0.3,
      spinLater: 0.9,
      avgFirstInnings: 155,
      description: "Spin-friendly, low and slow pitch. Deteriorates as match progresses. Teams batting first often set sub-par totals.",
    },
  },
  {
    name: "M Chinnaswamy Stadium",
    city: "Bengaluru",
    homeTeamIndex: 2, // RCB
    traits: {
      paceAdvantage: 0.2,
      battingFriendly: 0.95,
      groundSize: 0.2,
      dewFactor: 0.5,
      spinLater: 0.1,
      avgFirstInnings: 185,
      description: "Smallest ground in the league. Run-fest venue with short boundaries. 200+ scores are common. Favors aggressive batsmen.",
    },
  },
  {
    name: "Eden Gardens",
    city: "Kolkata",
    homeTeamIndex: 3, // KKR
    traits: {
      paceAdvantage: 0.1,
      battingFriendly: 0.6,
      groundSize: 0.7,
      dewFactor: 0.6,
      spinLater: 0.5,
      avgFirstInnings: 168,
      description: "Balanced venue that offers something for everyone. Spin becomes a factor as the game progresses. Heavy dew in night matches.",
    },
  },
  {
    name: "Narendra Modi Stadium",
    city: "Ahmedabad",
    homeTeamIndex: null,
    traits: {
      paceAdvantage: 0.0,
      battingFriendly: 0.5,
      groundSize: 0.9,
      dewFactor: 0.4,
      spinLater: 0.6,
      avgFirstInnings: 162,
      description: "Largest ground in the world. Big boundaries make it tough for batsmen. Spin-friendly pitch, especially in second half.",
    },
  },
  {
    name: "Arun Jaitley Stadium",
    city: "Delhi",
    homeTeamIndex: null,
    traits: {
      paceAdvantage: 0.3,
      battingFriendly: 0.65,
      groundSize: 0.5,
      dewFactor: 0.5,
      spinLater: 0.3,
      avgFirstInnings: 170,
      description: "Good pace and bounce early on. Gets easier for batting as the game progresses. Moderate-sized boundaries.",
    },
  },
  {
    name: "Rajiv Gandhi Stadium",
    city: "Hyderabad",
    homeTeamIndex: null,
    traits: {
      paceAdvantage: 0.5,
      battingFriendly: 0.7,
      groundSize: 0.6,
      dewFactor: 0.8,
      spinLater: 0.2,
      avgFirstInnings: 172,
      description: "Pace-friendly with good bounce. Heavy dew makes chasing easier. Fast outfield rewards timing.",
    },
  },
  {
    name: "IS Bindra Stadium",
    city: "Mohali",
    homeTeamIndex: null,
    traits: {
      paceAdvantage: 0.6,
      battingFriendly: 0.55,
      groundSize: 0.65,
      dewFactor: 0.3,
      spinLater: 0.3,
      avgFirstInnings: 165,
      description: "Best pace bowling venue. Seam and swing throughout. Good test of batting technique against quality pace.",
    },
  },
];

export function getVenueForMatch(team1Index: number, team2Index: number, matchNumber: number): Venue {
  // Home matches: first leg at team1's home, second leg at team2's home
  // For a round-robin of 4 teams playing twice, assign home venues
  const homeVenues = VENUES.filter((v) => v.homeTeamIndex !== null);
  const neutralVenues = VENUES.filter((v) => v.homeTeamIndex === null);

  // First encounter: team1 home, second encounter: team2 home
  // For playoffs/finals: neutral venue
  if (matchNumber <= 12) {
    // League: alternate home games
    const isFirstLeg = matchNumber <= 6;
    const homeTeam = isFirstLeg ? team1Index : team2Index;
    const homeVenue = homeVenues.find((v) => v.homeTeamIndex === homeTeam);
    if (homeVenue) return homeVenue;
  }

  // Playoffs and finals at neutral venues
  return neutralVenues[matchNumber % neutralVenues.length];
}

export function getVenueAdvantage(venue: Venue, teamIndex: number): number {
  if (venue.homeTeamIndex === teamIndex) return 0.05; // 5% home advantage
  return 0;
}
