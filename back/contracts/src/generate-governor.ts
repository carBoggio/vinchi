/**
 * Generates a real governor secret key and prints the governorPk (its
 * governorKey hash) that both contracts' constructors need. Run once, then
 * paste the printed GOVERNOR_SECRET_KEY line into the repo-root .env and
 * redeploy both contracts (deploy-address.ts reads it from there and uses
 * computeGovernorKey(sk) as governorPk instead of the old zero-byte
 * placeholder).
 *
 * Usage: npx tsx src/generate-governor.ts
 */
import { randomBytes } from 'node:crypto';
import { computeGovernorKey } from './governor';

const sk = randomBytes(32);
const governorPk = computeGovernorKey(sk);

console.log('\nAdd this line to the repo-root .env:\n');
console.log(`GOVERNOR_SECRET_KEY=${sk.toString('hex')}`);
console.log(`\ngovernorPk (informational — deploy-address.ts computes this itself from the line above):`);
console.log(`  ${Buffer.from(governorPk).toString('hex')}\n`);
console.log('Then redeploy both contracts:');
console.log('  npx tsx src/deploy-address.ts VinchiNotes');
console.log('  npx tsx src/deploy-address.ts MerchantRegistry');
console.log('...and copy the printed addresses into VINCHI_NOTES_ADDRESS / MERCHANT_REGISTRY_ADDRESS in .env.\n');
