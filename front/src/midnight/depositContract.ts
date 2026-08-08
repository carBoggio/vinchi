// Loads the compiled VinchiNotes contract for the browser. Imports from
// ./generated/VinchiNotes/, which scripts/sync-contract-assets.mjs copies in
// from back/contracts/contracts/managed/VinchiNotes/contract/ (run via
// predev/prebuild) — NOT a live cross-project reach-across. A dynamic import
// pointed straight at back/contracts/ resolves, in the browser, as a URL
// relative to *this* module's URL; that can't climb above the dev server's
// root, so "../../../back/..." silently lands on a nonexistent front/back/
// path instead of escaping to the sibling project. Copying the compiled
// output into front/'s own tree sidesteps that entirely, and also makes this
// work under `vite build`, not just `npm run dev`.
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import * as VinchiNotes from './generated/VinchiNotes/index.js';

const CONTRACT_TAG = 'VinchiNotes';

// deposit never invokes these — they're only reachable from pay/materialize/
// redeem/pokeIndex/syncMerchantRoot — but the generated Contract class still
// requires an implementation for every witness the .compact source declares.
// Matches the exact stub pattern back/contracts/src/deploy-address.ts already
// uses (and has already successfully deployed this contract with).
function throwingWitness(name: string) {
  return (): never => {
    throw new Error(`witness '${name}' is not implemented in the browser deposit flow (deposit doesn't need it)`);
  };
}

const witnesses = {
  governorSecretKey: throwingWitness('governorSecretKey'),
  nullifierKeyFor: throwingWitness('nullifierKeyFor'),
  mulDivFloorWitness: throwingWitness('mulDivFloorWitness'),
};

/**
 * Wraps back/contracts' compiled VinchiNotes bindings as a CompiledContract
 * ready for findDeployedContract/callTx.
 */
export function loadVinchiNotesCompiledContract() {
  return CompiledContract.make(CONTRACT_TAG, VinchiNotes.Contract as never).pipe(
    CompiledContract.withWitnesses(witnesses as never),
  );
}

/**
 * ownerCommitment(nullifierKey) — same pure circuit VinchiNotes uses to check
 * note ownership. No witnesses, no proof, no network call: plain hashing, so
 * this is safe to run client-side to turn a fresh secret into the value the
 * deposit form's "recipient owner commitment" field needs. Mirrors
 * back/contracts/src/generate-recipient.ts (same computation, Node side).
 */
export function computeOwnerCommitment(nullifierKey: Uint8Array): Uint8Array {
  return VinchiNotes.pureCircuits.ownerCommitment(nullifierKey);
}
