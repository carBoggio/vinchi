/**
 * Generates a note-ownership secret for VinchiNotes and prints/saves the two
 * values a depositor needs:
 *   - nullifierKey: a random 32-byte secret. NOT a wallet key — this is
 *     specific to Vinchi's note-ownership scheme (see VinchiNotes.compact's
 *     `nullifierKeyFor` witness). Whoever holds this can later prove
 *     ownership of any note deposited to its commitment. Keep it private.
 *   - recipientOwner: ownerCommitment(nullifierKey), computed with the exact
 *     same pure circuit the contract itself uses to check ownership. This is
 *     the public value that goes in the deposit form's "Recipient owner
 *     commitment" field.
 *
 * Usage:
 *   npx tsx src/generate-recipient.ts [output-file]   (default: recipient.txt)
 *
 * No network, wallet, or proof server involved — ownerCommitment is a pure
 * circuit (no witnesses, no proof), so this is plain local hashing.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contractPath = path.resolve(__dirname, '..', 'contracts', 'managed', 'VinchiNotes', 'contract', 'index.js');

if (!fs.existsSync(contractPath)) {
  console.error('\n❌ VinchiNotes not compiled. Run: npm run compile:vinchi-notes\n');
  process.exit(1);
}

const VinchiNotes = await import(pathToFileURL(contractPath).href);

const nullifierKey = randomBytes(32);
const recipientOwner: Uint8Array = VinchiNotes.pureCircuits.ownerCommitment(nullifierKey);

const nullifierKeyHex = Buffer.from(nullifierKey).toString('hex');
const recipientOwnerHex = Buffer.from(recipientOwner).toString('hex');

const outPath = path.resolve(process.cwd(), process.argv[2] ?? 'recipient.txt');
const contents = [
  `Generated ${new Date().toISOString()}`,
  '',
  'SECRET — nullifierKey. Do not share. Needed later to prove ownership (pay/materialize/redeem, not yet implemented).',
  nullifierKeyHex,
  '',
  'PUBLIC — recipientOwner = ownerCommitment(nullifierKey). Paste into the deposit form.',
  recipientOwnerHex,
  '',
].join('\n');

fs.writeFileSync(outPath, contents, { mode: 0o600 });

console.log(`\nnullifierKey (secret):   ${nullifierKeyHex}`);
console.log(`recipientOwner (public): ${recipientOwnerHex}`);
console.log(`\nSaved to ${outPath}\n`);
