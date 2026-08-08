// Loads compiled contracts for the browser. Imports from ./generated/<Name>/,
// which scripts/sync-contract-assets.mjs copies in from
// back/contracts/contracts/managed/<Name>/contract/ (run via predev/prebuild)
// — NOT a live cross-project reach-across. A dynamic import pointed straight
// at back/contracts/ resolves, in the browser, as a URL relative to *this*
// module's URL; that can't climb above the dev server's root, so
// "../../../back/..." silently lands on a nonexistent front/back/ path
// instead of escaping to the sibling project. Copying the compiled output
// into front/'s own tree sidesteps that entirely, and also makes this work
// under `vite build`, not just `npm run dev`.
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import * as VinchiNotes from './generated/VinchiNotes/index.js';
import * as MerchantRegistry from './generated/MerchantRegistry/index.js';

export type NoteBody = {
  owner: Uint8Array;
  amount: bigint;
  maturesAt: bigint;
  rateBps: bigint;
  matured: boolean;
};

// deposit never invokes these — they're only reachable from pay/materialize/
// redeem/pokeIndex/syncMerchantRoot — but the generated Contract class still
// requires an implementation for every witness the .compact source declares.
// Matches the exact stub pattern back/contracts/src/deploy-address.ts already
// uses (and has already successfully deployed both contracts with).
function throwingWitness(name: string) {
  return (): never => {
    throw new Error(`witness '${name}' is not implemented in the browser flow that invoked this circuit`);
  };
}

export type VinchiNotesWitnesses = {
  governorSecretKey: (...args: never[]) => never;
  nullifierKeyFor: (...args: never[]) => never;
  mulDivFloorWitness: (...args: never[]) => never;
};

const defaultVinchiNotesWitnesses: VinchiNotesWitnesses = {
  governorSecretKey: throwingWitness('governorSecretKey'),
  nullifierKeyFor: throwingWitness('nullifierKeyFor'),
  mulDivFloorWitness: throwingWitness('mulDivFloorWitness'),
};

/**
 * Wraps back/contracts' compiled VinchiNotes bindings as a CompiledContract
 * ready for findDeployedContract/callTx. `witnessOverrides` replaces the
 * default throwing stubs — deposit needs none of them (pass nothing), but
 * pay/materialize/redeem genuinely invoke `nullifierKeyFor` to prove note
 * ownership, so those flows must supply a real implementation (see
 * noteWallet.ts's deriveNullifierKey — this project has one stable
 * nullifierKey per seed, not per note, so the witness can ignore its `owner`
 * argument and just return that key; the circuit itself double-checks
 * ownerCommitment(key) == owner and rejects the proof if it's wrong).
 */
export function loadVinchiNotesCompiledContract(witnessOverrides: Partial<VinchiNotesWitnesses> = {}) {
  const witnesses = { ...defaultVinchiNotesWitnesses, ...witnessOverrides };
  return CompiledContract.make('VinchiNotes', VinchiNotes.Contract as never).pipe(
    CompiledContract.withWitnesses(witnesses as never),
  );
}

/**
 * ownerCommitment(nullifierKey) — the same pure circuit VinchiNotes uses to
 * check note ownership. No witnesses, no proof, no network call: plain
 * hashing, so this is safe to run client-side. Mirrors
 * back/contracts/src/generate-recipient.ts (same computation, Node side).
 */
export function computeOwnerCommitment(nullifierKey: Uint8Array): Uint8Array {
  return VinchiNotes.pureCircuits.ownerCommitment(nullifierKey);
}

/**
 * noteCommitment(body, nonce) — the pure circuit VinchiNotes uses to hash a
 * note's full contents into the 32-byte leaf stored in noteTree. Needed to
 * turn a candidate (owner, amount, maturesAt, nonce) tuple into the value
 * that's actually looked up on-chain (get_notes) or referenced when
 * building a new note (send_pay's outputs).
 */
export function computeNoteCommitment(body: NoteBody, nonce: Uint8Array): Uint8Array {
  return VinchiNotes.pureCircuits.noteCommitment(body, nonce);
}

/**
 * noteNullifier(nonce, nullifierKey) — the pure circuit VinchiNotes uses to
 * derive the public value published when a note is spent. Needed to check
 * whether a candidate note has already been spent (get_notes) without
 * needing to invoke the contract or a witness.
 */
export function computeNoteNullifier(nonce: Uint8Array, nullifierKey: Uint8Array): Uint8Array {
  return VinchiNotes.pureCircuits.noteNullifier(nonce, nullifierKey);
}

const merchantRegistryWitnesses = {
  governorSecretKey: throwingWitness('governorSecretKey'),
};

/**
 * Wraps back/contracts' compiled MerchantRegistry bindings as a
 * CompiledContract. Read-only usage from the browser (pay needs the
 * merchant tree's state to build a membership proof) — addMerchant is
 * governor-only and runs from back/contracts/src/register-merchant.ts, not
 * from here.
 */
export function loadMerchantRegistryCompiledContract() {
  return CompiledContract.make('MerchantRegistry', MerchantRegistry.Contract as never).pipe(
    CompiledContract.withWitnesses(merchantRegistryWitnesses as never),
  );
}
