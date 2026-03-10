const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const auctions = await prisma.auction.findMany({
    where: { status: { in: ['LOBBY', 'RUNNING'] } },
    include: { teams: { include: { agent: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  for (const a of auctions) {
    const config = JSON.parse(a.config || '{}');
    console.log('Auction:', a.id, '| Status:', a.status, '| Teams:', a.teams.length);
    console.log('  External slots:', JSON.stringify(config.externalSlots || {}));
    for (const t of a.teams) {
      console.log('  Team', t.teamIndex, ':', t.agent.name, '| ID:', t.id);
    }
  }
  if (auctions.length === 0) console.log('No active auctions found');
  await prisma.$disconnect();
}

main().catch(console.error);
