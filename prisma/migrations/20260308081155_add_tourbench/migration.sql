-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auctionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "config" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME
);

-- CreateTable
CREATE TABLE "TournamentMatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "matchNumber" INTEGER NOT NULL,
    "matchType" TEXT NOT NULL DEFAULT 'LEAGUE',
    "team1Index" INTEGER NOT NULL,
    "team2Index" INTEGER NOT NULL,
    "venue" TEXT NOT NULL,
    "venueTraits" TEXT NOT NULL DEFAULT '{}',
    "homeTeamIndex" INTEGER,
    "actualWinner" INTEGER,
    "actualMargin" TEXT,
    "team1Strength" REAL NOT NULL DEFAULT 0,
    "team2Strength" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "TournamentMatch_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TournamentPrediction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL DEFAULT '',
    "predictedWinner" INTEGER NOT NULL,
    "confidence" REAL NOT NULL,
    "predictedMargin" TEXT NOT NULL DEFAULT '',
    "keyFactors" TEXT NOT NULL DEFAULT '[]',
    "reasoning" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "TournamentPrediction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "TournamentMatch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TournamentEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "results" TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "TournamentEvaluation_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TournamentMatch_tournamentId_idx" ON "TournamentMatch"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentPrediction_matchId_idx" ON "TournamentPrediction"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentPrediction_matchId_agentId_key" ON "TournamentPrediction"("matchId", "agentId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentEvaluation_tournamentId_key" ON "TournamentEvaluation"("tournamentId");
