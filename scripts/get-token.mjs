import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Read SQLite directly
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

// Use sqlite3 CLI if available, otherwise parse via fetch
const auctionId = process.argv[2] || 'cmminfs1a017trkqiz2ybig1z';

try {
  const result = execSync(
    `sqlite3 "${process.cwd()}/prisma/dev.db" "SELECT config FROM Auction WHERE id='${auctionId}'"`,
    { encoding: 'utf-8' }
  );
  const config = JSON.parse(result.trim());
  console.log('External slots:', JSON.stringify(config.externalSlots, null, 2));
} catch (e) {
  console.error('sqlite3 not available, trying API approach');
  // Fallback: read the state endpoint with a known token won't work
  // Need to get from DB
  console.log('Please check auction config in DB manually');
}
