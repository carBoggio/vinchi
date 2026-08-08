// Shared read-only access to on-chain contract state (VinchiNotes' noteTree
// + nullifiers, MerchantRegistry's merchants tree). Both the notes-reading
// flow (get_notes.tsx) and the payment flow (send_pay.tsx) need this same
// querying — defined once here so they can't drift into two different ways
// of reading the same ledger.
import type { PublicDataProvider } from '@midnight-ntwrk/midnight-js-types';
import type { StateValue, ChargedState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import * as VinchiNotes from './generated/VinchiNotes/index.js';
import * as MerchantRegistry from './generated/MerchantRegistry/index.js';

export type VinchiNotesLedger = ReturnType<typeof VinchiNotes.ledger>;
export type MerchantRegistryLedger = ReturnType<typeof MerchantRegistry.ledger>;

async function queryLedger<T>(
  publicDataProvider: PublicDataProvider,
  contractAddress: string,
  contractName: string,
  ledgerFn: (data: StateValue | ChargedState) => T,
): Promise<T> {
  const state = await publicDataProvider.queryContractState(contractAddress);
  if (!state) {
    throw new Error(`${contractName} contract state not found at ${contractAddress} — is it deployed on this network?`);
  }
  return ledgerFn(state.data);
}

/** Reads VinchiNotes' current public ledger state: noteTree, nullifiers, totalCollateral, etc. */
export function queryVinchiNotesLedger(
  publicDataProvider: PublicDataProvider,
  contractAddress: string,
): Promise<VinchiNotesLedger> {
  return queryLedger(publicDataProvider, contractAddress, 'VinchiNotes', VinchiNotes.ledger);
}

/** Reads MerchantRegistry's current public ledger state: the merchants tree. */
export function queryMerchantRegistryLedger(
  publicDataProvider: PublicDataProvider,
  contractAddress: string,
): Promise<MerchantRegistryLedger> {
  return queryLedger(publicDataProvider, contractAddress, 'MerchantRegistry', MerchantRegistry.ledger);
}

/**
 * Merkle path proving `commitment` is a leaf of noteTree, or undefined if
 * it isn't present (not yet indexed, or never inserted). Required to build
 * a NoteInput for pay/materialize/redeem.
 */
export function findNoteMerklePath(ledger: VinchiNotesLedger, commitment: Uint8Array) {
  return ledger.noteTree.findPathForLeaf(commitment);
}

/** True if `nullifier` has already been published (i.e. the note it belongs to was already spent). */
export function isNullifierSpent(ledger: VinchiNotesLedger, nullifier: Uint8Array): boolean {
  return ledger.nullifiers.member(nullifier);
}

/**
 * Merkle path proving `merchantOwnerCommitment` is a registered merchant, or
 * undefined if it isn't (not registered, or a stale local root). Required to
 * build pay's merchantPath argument — proves membership without revealing
 * which merchant it is.
 */
export function findMerchantMerklePath(ledger: MerchantRegistryLedger, merchantOwnerCommitment: Uint8Array) {
  return ledger.merchants.findPathForLeaf(merchantOwnerCommitment);
}
