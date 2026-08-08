/**
 * Diagnostic: derives the Dust key two different ways from the same
 * mnemonic and prints both resulting DUST addresses, to check whether
 * back/contracts/src/wallet.ts's combined selectRoles([Zswap, NightExternal,
 * Dust]).deriveKeysAt(0) call produces a different Dust key than deriving
 * Dust alone via selectRole(Roles.Dust).deriveKeyAt(0) (the pattern
 * example-bboard's getUnshieldedSeed uses, generalized to the Dust role).
 *
 * Usage: MIDNIGHT_WALLET_MNEMONIC="..." npx tsx scripts/diagnose-dust-key.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk';
import { DustSecretKey } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { DustAddress } from '@midnight-ntwrk/wallet-sdk/address-format';
import { setNetworkId, getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { mnemonicToSeedHex, normalizeMnemonic, isValidMnemonic, resolveNetwork } from '../src/network.js';

function loadRootEnv(): void {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootEnvPath = path.resolve(__dirname, '..', '..', '..', '.env');
  if (!fs.existsSync(rootEnvPath)) return;
  process.loadEnvFile(rootEnvPath);
}
loadRootEnv();

const { network } = resolveNetwork();
setNetworkId(network);

const raw = process.env.MIDNIGHT_WALLET_MNEMONIC;
if (!raw || !isValidMnemonic(raw)) {
  console.error('Set a valid MIDNIGHT_WALLET_MNEMONIC.');
  process.exit(1);
}
const seed = mnemonicToSeedHex(normalizeMnemonic(raw));
const seedBuffer = Buffer.from(seed, 'hex');

// Approach A: combined multi-role derivation (back/contracts/src/wallet.ts's deriveKeys).
const combined = HDWallet.fromSeed(seedBuffer);
if (combined.type !== 'seedOk') throw new Error('bad seed');
const combinedResult = combined.hdWallet
  .selectAccount(0)
  .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
  .deriveKeysAt(0);
if (combinedResult.type !== 'keysDerived') throw new Error('combined derivation failed');
const combinedDustKey = combinedResult.keys[Roles.Dust];

// Approach B: single-role derivation (example-bboard's getUnshieldedSeed pattern, for Dust).
const single = HDWallet.fromSeed(seedBuffer);
if (single.type !== 'seedOk') throw new Error('bad seed');
const singleResult = single.hdWallet.selectAccount(0).selectRole(Roles.Dust).deriveKeyAt(0);
if (singleResult.type === 'keyOutOfBounds') throw new Error('single derivation out of bounds');
const singleDustKey = singleResult.key;

const combinedAddr = DustAddress.encodePublicKey(getNetworkId(), DustSecretKey.fromSeed(combinedDustKey).publicKey);
const singleAddr = DustAddress.encodePublicKey(getNetworkId(), DustSecretKey.fromSeed(singleDustKey).publicKey);

console.log(`\nCombined (selectRoles + deriveKeysAt) dust address: ${combinedAddr}`);
console.log(`Single   (selectRole + deriveKeyAt)   dust address: ${singleAddr}`);
console.log(`\nSame key material: ${Buffer.from(combinedDustKey).equals(Buffer.from(singleDustKey))}`);
