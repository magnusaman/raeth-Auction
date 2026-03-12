const { PrismaClient } = require('../src/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL || 'postgresql://raeth:raeth@localhost:5432/raeth' });
const prisma = new PrismaClient({ adapter });

async function main() {
  const id = 'cmmm5hwqi00002';
  const a = await prisma.auction.findUnique({
    where: { id },
    include: { teams: { include: { agent: true } } },
  });

  if (!a) {
    console.log('AUCTION NOT FOUND:', id);
    return;
  }

  console.log('Status:', a.status);
  console.log('Teams:', a.teams.length);
  console.log('Config:', (a.config || '').slice(0, 500));

  const playerCount = await prisma.auctionPlayer.count({ where: { auctionId: id } });
  console.log('Players:', playerCount);

  const lotCount = await prisma.lot.count({ where: { auctionId: id } });
  console.log('Lots:', lotCount);

  for (const t of a.teams) {
    console.log(`  Team ${t.teamIndex} - Agent: ${t.agent ? t.agent.name : 'NULL'} - Squad: ${t.squadSize} - Purse: ${t.purseRemaining}`);
  }
}

main()
  .catch((e) => console.error('ERROR:', e.message, e.stack))
  .finally(() => prisma.$disconnect());
