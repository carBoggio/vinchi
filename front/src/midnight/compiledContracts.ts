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

const vinchiNotesWitnesses = {
  governorSecretKey: throwingWitness('governorSecretKey'),
  nullifierKeyFor: throwingWitness('nullifierKeyFor'),
  mulDivFloorWitness: throwingWitness('mulDivFloorWitness'),
};

/**
 * Wraps back/contracts' compiled VinchiNotes bindings as a CompiledContract
 * ready for findDeployedContract/callTx. Reused by every VinchiNotes circuit
 * caller (deposit, pay, ...) — one instance definition, not one per flow.
 */
export function loadVinchiNotesCompiledContract() {
  return CompiledContract.make('VinchiNotes', VinchiNotes.Contract as never).pipe(
    CompiledContract.withWitnesses(vinchiNotesWitnesses as never),
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
