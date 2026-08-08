// Combines the three pieces needed to answer "what notes do I own, and are
// they still spendable": Flujo 6 derivation (noteWallet.ts), the encrypted
// off-chain breadcrumb backup (noteBackup.ts — the chain never stores
// amount/maturesAt, by design), and live on-chain state (ledgerQueries.ts).
// get_notes.tsx wraps this for display; send_pay.tsx uses it to pick inputs
// — both depend only on this module, not on each other.
import type { PublicDataProvider } from '@midnight-ntwrk/midnight-js-types';
import { deriveNullifierKey, deriveNoteNonce, deriveOwnerCommitment } from './noteWallet';
import { listNoteBreadcrumbs } from './noteBackup';
import { computeNoteCommitment, computeNoteNullifier, type NoteBody } from './compiledContracts';
import { queryVinchiNotesLedger, findNoteMerklePath, isNullifierSpent } from './ledgerQueries';

export interface OwnedNote {
  /** Breadcrumb index this note was derived from — see noteWallet.ts. */
  index: number;
  nonce: Uint8Array;
  body: NoteBody;
  commitment: Uint8Array;
  nullifier: Uint8Array;
  /** undefined if this commitment was never found in noteTree (e.g. a failed/unconfirmed deposit). */
  merklePath: ReturnType<typeof findNoteMerklePath>;
  inTree: boolean;
  /** True once this note's nullifier has been published (already spent via pay/materialize/redeem). */
  spent: boolean;
}

/**
 * Every note this app currently creates (deposit's output, pay's
 * merchantOutput/changeOutput) is unmatured lUSDv — materialize (the only
 * circuit that flips this) isn't wired into the frontend yet. Fixed here so
 * every OwnedNote is built the same way; revisit when materialize ships.
 */
const RATE_BPS = 0n;

/**
 * Reconstructs every note this seed has a backed-up breadcrumb for, and
 * checks each one against the live chain: is its commitment actually in
 * noteTree, and has its nullifier already been published. Read-only — no
 * wallet connection required, since VinchiNotes' state is public.
 */
export async function listOwnedNotes(
  seed: Uint8Array,
  publicDataProvider: PublicDataProvider,
  vinchiNotesAddress: string,
): Promise<OwnedNote[]> {
  const [nullifierKey, ownerCommitment, breadcrumbs, ledger] = await Promise.all([
    deriveNullifierKey(seed),
    deriveOwnerCommitment(seed),
    listNoteBreadcrumbs(seed),
    queryVinchiNotesLedger(publicDataProvider, vinchiNotesAddress),
  ]);

  const notes: OwnedNote[] = [];
  for (const crumb of breadcrumbs) {
    const nonce = await deriveNoteNonce(seed, crumb.index);
    const body: NoteBody = {
      owner: ownerCommitment,
      amount: crumb.amount,
      maturesAt: crumb.maturesAt,
      rateBps: RATE_BPS,
      matured: false,
    };
    const commitment = computeNoteCommitment(body, nonce);
    const merklePath = findNoteMerklePath(ledger, commitment);
    const inTree = merklePath !== undefined;
    const nullifier = computeNoteNullifier(nonce, nullifierKey);
    const spent = inTree && isNullifierSpent(ledger, nullifier);
    notes.push({ index: crumb.index, nonce, body, commitment, nullifier, merklePath, inTree, spent });
  }
  return notes;
}

/** Notes that are confirmed on-chain and not yet spent — the only ones usable as pay/materialize/redeem inputs. */
export function spendableNotes(notes: OwnedNote[]): OwnedNote[] {
  return notes.filter((n) => n.inTree && !n.spent);
}

/** Sum of spendable, unmatured (lUSDv) note amounts — the balance a user can actually pay with today. */
export function totalSpendableLusdv(notes: OwnedNote[]): bigint {
  return spendableNotes(notes)
    .filter((n) => !n.body.matured)
    .reduce((sum, n) => sum + n.body.amount, 0n);
}
