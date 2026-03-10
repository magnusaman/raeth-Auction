// Random name pools for synthetic player generation
// Mix of Indian + overseas names (no real player names)

export const INDIAN_FIRST_NAMES = [
  "Arjun", "Vivek", "Rohit", "Pranav", "Karthik", "Aditya", "Siddharth",
  "Nikhil", "Harsh", "Dhruv", "Ankit", "Ravi", "Gaurav", "Manish", "Suresh",
  "Rajesh", "Vikram", "Ashwin", "Deepak", "Amit", "Rohan", "Sahil", "Varun",
  "Tarun", "Yash", "Akash", "Neeraj", "Rahul", "Kunal", "Aarav",
  "Ishaan", "Kabir", "Vedant", "Arnav", "Reyansh", "Shaurya", "Atharv",
  "Advait", "Vihaan", "Parth", "Tanmay", "Lakshya", "Shreyas", "Devesh",
  "Jayant", "Madhav", "Nakul", "Raghav", "Saurabh", "Tejas",
];

export const INDIAN_LAST_NAMES = [
  "Sharma", "Patel", "Kumar", "Singh", "Yadav", "Reddy", "Nair",
  "Iyer", "Pillai", "Chauhan", "Joshi", "Mishra", "Desai", "Mehta",
  "Gupta", "Verma", "Pandey", "Tiwari", "Kulkarni", "Patil",
  "Malhotra", "Kapoor", "Thakur", "Saxena", "Banerjee", "Chatterjee",
  "Deshpande", "Hegde", "Menon", "Rajan", "Bhat", "Kamath",
  "Gowda", "Naidu", "Rao", "Shetty", "Acharya", "Dutta",
  "Choudhary", "Bajaj", "Sethi", "Dhawan", "Khanna", "Bhatia",
  "Gill", "Sandhu", "Grewal", "Sidhu", "Mann", "Randhawa",
];

export const OVERSEAS_FIRST_NAMES = [
  // Australian
  "Mitchell", "James", "Travis", "Josh", "Marcus", "Cameron", "Nathan",
  "Adam", "Daniel", "Aaron", "Tim", "Chris", "Ben", "Luke", "Andrew",
  // English
  "Harry", "Joe", "Sam", "Oliver", "George", "Will", "Tom", "Jack",
  "Liam", "Charlie", "Jonny", "Mark", "Jason", "Reece", "Phil",
  // South African
  "Aiden", "Faf", "Quinton", "Dewald", "Rassie", "Heinrich", "Wayne",
  "Dale", "Kagiso", "Lungi", "Anrich", "Marco", "Gerald", "Ryan",
  // West Indian
  "Andre", "Dwayne", "Kieron", "Jason", "Shimron", "Alzarri", "Romario",
  "Shai", "Brandon", "Fabian", "Kyle", "Sheldon", "Obed", "Akeal",
  // New Zealand
  "Kane", "Trent", "Kyle", "Devon", "Daryl", "Glenn", "Finn",
  "Lockie", "Jimmy", "Matt", "Tim", "Colin", "Ross", "Martin",
];

export const OVERSEAS_LAST_NAMES = [
  // Australian
  "Johnson", "Smith", "Warner", "Patterson", "Stoinis", "Maxwell", "Richardson",
  "Hazlewood", "Cummins", "Green", "Labuschagne", "Marsh", "Carey", "Head",
  // English
  "Brook", "Root", "Wood", "Stone", "Archer", "Butler", "Stokes",
  "Curran", "Woakes", "Livingstone", "Topley", "Potts", "Rehan", "Salt",
  // South African
  "Markram", "Bavuma", "Klaasen", "Brevis", "Jansen", "Pretorius",
  "Rabada", "Ngidi", "Nortje", "Hendricks", "Miller", "Coetzee",
  // West Indian
  "Russell", "Bravo", "Pollard", "Pooran", "Hope", "Joseph", "Shepherd",
  "Allen", "McCoy", "Hosein", "Thomas", "Pierre", "Hetmyer", "King",
  // New Zealand
  "Williamson", "Boult", "Southee", "Conway", "Mitchell", "Phillips",
  "Ferguson", "Neesham", "Santner", "Chapman", "Henry", "Jamieson",
];

export const OVERSEAS_COUNTRIES = [
  "Australia", "England", "South Africa", "West Indies", "New Zealand",
  "Afghanistan", "Sri Lanka", "Bangladesh",
];

export function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateIndianName(): string {
  return `${randomFrom(INDIAN_FIRST_NAMES)} ${randomFrom(INDIAN_LAST_NAMES)}`;
}

export function generateOverseasName(): { name: string; country: string } {
  const country = randomFrom(OVERSEAS_COUNTRIES);
  return {
    name: `${randomFrom(OVERSEAS_FIRST_NAMES)} ${randomFrom(OVERSEAS_LAST_NAMES)}`,
    country,
  };
}
