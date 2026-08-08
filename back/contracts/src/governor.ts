/**
 * Replicates VinchiNotes.compact's / MerchantRegistry.compact's internal
 * (non-exported) `governorKey(sk)` circuit in plain TypeScript, so a real
 * governor secret key can be turned into the constructor's `governorPk`
 * argument without touching the .compact source.
 *
 * Verified bit-exact against the compiled output: both contracts compile
 * `governorKey(sk)` to
 *   persistentHash(CompactTypeVector(2, Bytes32Descriptor), [pad(32, "vinchi:governor"), sk])
 * (see contracts/managed/VinchiNotes/contract/index.js's `_governorKey_0` —
 * same domain separator and structure in MerchantRegistry's compiled
 * output). `persistentHash`, `CompactTypeVector` and `Bytes32Descriptor`
 * are all public exports of @midnight-ntwrk/compact-runtime, so this needs
 * no access to anything the compiler doesn't already expose.
 *
 * Why this exists at all: the deployed contracts' `governorPk` was a
 * placeholder (32 zero bytes) — no secret key hashes to that (preimage
 * resistance), so every governor-gated circuit (addMerchant, pokeIndex,
 * syncMerchantRoot) was structurally unusable. `governor` is a `sealed`
 * ledger field (fixed forever at construction), so fixing this requires a
 * fresh deployment with a real governorPk — this module computes that.
 */
import { persistentHash, CompactTypeVector, Bytes32Descriptor } from '@midnight-ntwrk/compact-runtime';

const GOVERNOR_DOMAIN_SEPARATOR = (() => {
  const padded = new Uint8Array(32);
  padded.set(new TextEncoder().encode('vinchi:governor'));
  return padded;
})();

const governorKeyDescriptor = new CompactTypeVector(2, Bytes32Descriptor);

/** governorKey(sk) — bit-exact match to the .compact circuit of the same name. */
export function computeGovernorKey(sk: Uint8Array): Uint8Array {
  if (sk.length !== 32) throw new Error(`governor secret key must be 32 bytes, got ${sk.length}`);
  return persistentHash(governorKeyDescriptor, [GOVERNOR_DOMAIN_SEPARATOR, sk]);
}

const SEED_HEX_RE = /^[0-9a-fA-F]{64}$/;

/**
 * Reads the governor secret key from GOVERNOR_SECRET_KEY in the repo-root
 * .env. Throws with an actionable message if unset or malformed — every
 * governor action (deploy, addMerchant, syncMerchantRoot) needs this and
 * none of them should silently fall back to an unusable placeholder.
 */
export function requireGovernorSecretKey(env: NodeJS.ProcessEnv = process.env): Uint8Array {
  const raw = env.GOVERNOR_SECRET_KEY?.trim();
  if (!raw) {
    throw new Error(
      'GOVERNOR_SECRET_KEY is not set in the repo-root .env. Run `npx tsx src/generate-governor.ts` first ' +
        '(back/contracts/), then copy its output into .env, then redeploy both contracts.',
    );
  }
  const hex = raw.startsWith('0x') || raw.startsWith('0X') ? raw.slice(2) : raw;
  if (!SEED_HEX_RE.test(hex)) {
    throw new Error('GOVERNOR_SECRET_KEY must be 32 bytes (64 hex characters).');
  }
  return Buffer.from(hex, 'hex');
}
