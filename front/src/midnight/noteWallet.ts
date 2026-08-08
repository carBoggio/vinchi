// Flujo 6 (recuperación de notas): deterministic key/nonce derivation from a
// single 32-byte seed, via HKDF (WebCrypto's native `deriveBits`/`deriveKey`
// with algorithm 'HKDF' — no extra dependency). One seed produces:
//   - a single, stable nullifierKey (the secret that proves note ownership —
//     see VinchiNotes.compact's nullifierKeyFor witness; one per user, not
//     per note, matching how ownerCommitment(nullifierKey) is used as the
//     `owner` field across all of a user's notes)
//   - a deterministic nonce per note index (nonce_i = HKDF(seed, i)) — the
//     same nonce is always recoverable from (seed, index) alone, which is
//     what makes rediscovering a note without a local cache possible.
//
// The seed itself is the one thing this module cannot back up for you: it's
// generated locally and persisted only in this browser's localStorage.
// exportSeedHex()/importSeedHex() exist so the user can write it down (or
// paste it into a new browser) — losing it without a manual backup means
// losing every note it derives, by design (same tradeoff the project's docs
// describe for note recovery in general).
import { computeOwnerCommitment } from './compiledContracts';

const SEED_STORAGE_KEY = 'vinchi:wallet-seed';
const SEED_BYTES = 32;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') || hex.startsWith('0X') ? hex.slice(2) : hex;
  if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

/** Reads the wallet seed from localStorage, generating and persisting one on first use. */
export function getOrCreateSeed(): Uint8Array {
  const stored = localStorage.getItem(SEED_STORAGE_KEY);
  if (stored) return hexToBytes(stored);
  const fresh = crypto.getRandomValues(new Uint8Array(SEED_BYTES));
  localStorage.setItem(SEED_STORAGE_KEY, bytesToHex(fresh));
  return fresh;
}

/** Hex-encodes the seed for the user to write down as a manual backup. */
export function exportSeedHex(seed: Uint8Array): string {
  return bytesToHex(seed);
}

/** Restores a seed from a previously exported hex string, persisting it as this browser's active seed. */
export function importSeedHex(hex: string): Uint8Array {
  const seed = hexToBytes(hex);
  if (seed.length !== SEED_BYTES) {
    throw new Error(`Seed must be ${SEED_BYTES} bytes (${SEED_BYTES * 2} hex chars), got ${seed.length}`);
  }
  localStorage.setItem(SEED_STORAGE_KEY, bytesToHex(seed));
  return seed;
}

async function hkdfBits(seed: Uint8Array, info: string, lengthBits: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey('raw', seed as BufferSource, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: new TextEncoder().encode(info) },
    keyMaterial,
    lengthBits,
  );
  return new Uint8Array(bits);
}

/** The stable, per-seed secret that proves ownership of any note whose `owner` field is ownerCommitment(this). */
export function deriveNullifierKey(seed: Uint8Array): Promise<Uint8Array> {
  return hkdfBits(seed, 'vinchi:nullifierKey', 256);
}

/** Deterministic nonce for note index `i` — always recoverable from (seed, i) alone, per Flujo 6. */
export function deriveNoteNonce(seed: Uint8Array, index: number): Promise<Uint8Array> {
  if (!Number.isInteger(index) || index < 0) throw new Error('index must be a non-negative integer');
  return hkdfBits(seed, `vinchi:nonce:${index}`, 256);
}

/** ownerCommitment(nullifierKey) for this seed — the value that goes in a note's `owner` field. */
export async function deriveOwnerCommitment(seed: Uint8Array): Promise<Uint8Array> {
  const nullifierKey = await deriveNullifierKey(seed);
  return computeOwnerCommitment(nullifierKey);
}
