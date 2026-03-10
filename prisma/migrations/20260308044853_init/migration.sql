-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "apiKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Auction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'LOBBY',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "config" TEXT NOT NULL DEFAULT '{}'
);

-- CreateTable
CREATE TABLE "AuctionTeam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auctionId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "teamIndex" INTEGER NOT NULL,
    "purseRemaining" REAL NOT NULL DEFAULT 100,
    "squadSize" INTEGER NOT NULL DEFAULT 0,
    "overseasCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "AuctionTeam_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AuctionTeam_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuctionPlayer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auctionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "subType" TEXT NOT NULL,
    "basePrice" REAL NOT NULL,
    "auctionOrder" INTEGER NOT NULL,
    "careerStats" TEXT NOT NULL DEFAULT '{}',
    "recentForm" TEXT NOT NULL DEFAULT '[]',
    "styleTags" TEXT NOT NULL DEFAULT '[]',
    "hiddenTrueValue" REAL NOT NULL DEFAULT 0,
    "hiddenSeasonPerf" TEXT NOT NULL DEFAULT '{}',
    "isTrap" BOOLEAN NOT NULL DEFAULT false,
    "isSleeper" BOOLEAN NOT NULL DEFAULT false,
    "soldPrice" REAL,
    "wonByTeamId" TEXT,
    "isUnsold" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "AuctionPlayer_wonByTeamId_fkey" FOREIGN KEY ("wonByTeamId") REFERENCES "AuctionTeam" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuctionPlayer_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auctionId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "lotNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    "finalPrice" REAL,
    "winnerId" TEXT,
    CONSTRAINT "Lot_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Lot_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "AuctionPlayer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lotId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "amount" REAL,
    "reasoning" TEXT NOT NULL DEFAULT '',
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roundNumber" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Bid_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Bid_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "AuctionTeam" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auctionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "results" TEXT NOT NULL DEFAULT '{}',
    "seasonSim" TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "Evaluation_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Agent_name_key" ON "Agent"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_apiKey_key" ON "Agent"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "AuctionTeam_auctionId_teamIndex_key" ON "AuctionTeam"("auctionId", "teamIndex");

-- CreateIndex
CREATE UNIQUE INDEX "AuctionTeam_auctionId_agentId_key" ON "AuctionTeam"("auctionId", "agentId");

-- CreateIndex
CREATE INDEX "AuctionPlayer_auctionId_idx" ON "AuctionPlayer"("auctionId");

-- CreateIndex
CREATE UNIQUE INDEX "Lot_playerId_key" ON "Lot"("playerId");

-- CreateIndex
CREATE INDEX "Lot_auctionId_idx" ON "Lot"("auctionId");

-- CreateIndex
CREATE INDEX "Bid_lotId_idx" ON "Bid"("lotId");

-- CreateIndex
CREATE UNIQUE INDEX "Evaluation_auctionId_key" ON "Evaluation"("auctionId");
