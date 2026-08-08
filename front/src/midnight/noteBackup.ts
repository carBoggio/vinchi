// Off-chain backup for the one thing Flujo 6's deterministic derivation
// (see noteWallet.ts) *cannot* recover on its own: which (index, amount,
// maturesAt) triples actually correspond to notes you created. The chain
// only stores a commitment hash — by design, it never reveals amount or
// maturity (see docs/superpowers context, "la cadena guarda huellas, no
// contenido") — so without this backup, losing this browser's localStorage
// means losing the ability to ever find your notes again, even though the
// underlying seed could still prove ownership of them.
//
// Privacy: Supabase never sees plaintext. Each row holds only:
//   - owner_tag: HMAC-derived from the seed, via a domain separator distinct
//     from the on-chain nullifierKey/ownerCommitment derivation — a dump of
//     this table cannot be linked to on-chain identity.
//   - ciphertext/iv: AES-GCM(amount, maturesAt), encrypted client-side with
//     a key derived from the same seed via a third, separate domain
//     separator. Decryption only happens locally, using the seed the user
//     already holds.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface NoteBreadcrumb {
  index: number;
  amount: bigint;
  maturesAt: bigint;
}

interface NoteBackupRow {
  note_index: number;
  ciphertext: string;
  iv: string;
}

let client: SupabaseClient | undefined;

function getSupabaseClient(): SupabaseClient {
  if (client) return client;
  const url = import.meta.env.SUPABASE_URL;
  const key = import.meta.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY are not set in /midnight/.env — note backup is unavailable ' +
        '(notes deposited or received in this browser session are still usable; they just cannot be recovered ' +
        'if this browser\'s localStorage is lost until these are configured).',
    );
  }
  client = createClient(url, key);
  return client;
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

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Domain separator distinct from noteWallet.ts's 'vinchi:nullifierKey' and
// 'vinchi:nonce:*' — this tag must never collide with an on-chain-derivable
// value, or a Supabase table dump could be cross-referenced against on-chain
// commitments.
async function deriveOwnerTag(seed: Uint8Array): Promise<string> {
  const bits = await hkdfBits(seed, 'vinchi:supabase-owner-tag', 256);
  return bytesToHex(bits);
}

async function deriveBackupAesKey(seed: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey('raw', seed as BufferSource, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: new TextEncoder().encode('vinchi:backup-key') },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypts and uploads a note breadcrumb (amount, maturesAt) to the
 * note_backups table, keyed by (owner_tag, note_index). Upsert: safe to
 * call again for the same index (e.g. a retry) without creating duplicates.
 */
export async function generate_commitment(params: {
  seed: Uint8Array;
  index: number;
  amount: bigint;
  maturesAt: bigint;
}): Promise<void> {
  const { seed, index, amount, maturesAt } = params;
  const ownerTag = await deriveOwnerTag(seed);
  const aesKey = await deriveBackupAesKey(seed);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify({ amount: amount.toString(), maturesAt: maturesAt.toString() }));
  const ciphertextBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, aesKey, plaintext);

  const supabase = getSupabaseClient();
  const { error } = await supabase.from('note_backups').upsert(
    {
      owner_tag: ownerTag,
      note_index: index,
      ciphertext: bytesToBase64(new Uint8Array(ciphertextBuf)),
      iv: bytesToBase64(iv),
    },
    { onConflict: 'owner_tag,note_index' },
  );
  if (error) throw new Error(`Failed to back up note breadcrumb: ${error.message}`);
}

/**
 * Fetches and decrypts every breadcrumb backed up for this seed. Used by
 * get_notes() to know which (index, amount, maturesAt) triples to check
 * against the chain — without this, only breadcrumbs created earlier in
 * the current localStorage session would be findable.
 */
export async function listNoteBreadcrumbs(seed: Uint8Array): Promise<NoteBreadcrumb[]> {
  const ownerTag = await deriveOwnerTag(seed);
  const aesKey = await deriveBackupAesKey(seed);

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('note_backups')
    .select('note_index, ciphertext, iv')
    .eq('owner_tag', ownerTag);
  if (error) throw new Error(`Failed to list note backups: ${error.message}`);

  const rows = (data ?? []) as NoteBackupRow[];
  const breadcrumbs: NoteBreadcrumb[] = [];
  for (const row of rows) {
    const iv = base64ToBytes(row.iv);
    const ciphertext = base64ToBytes(row.ciphertext);
    const plaintextBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, aesKey, ciphertext as BufferSource);
    const { amount, maturesAt } = JSON.parse(new TextDecoder().decode(plaintextBuf)) as {
      amount: string;
      maturesAt: string;
    };
    breadcrumbs.push({ index: row.note_index, amount: BigInt(amount), maturesAt: BigInt(maturesAt) });
  }
  return breadcrumbs.sort((a, b) => a.index - b.index);
}

/** Next unused breadcrumb index for this seed — one past the highest backed-up index. */
export async function nextBreadcrumbIndex(seed: Uint8Array): Promise<number> {
  const breadcrumbs = await listNoteBreadcrumbs(seed);
  return breadcrumbs.reduce((max, b) => Math.max(max, b.index + 1), 0);
}
