// Flujo 2 (pago): builds, proves, balances (via the connected wallet) and
// submits a `pay` transaction against the VinchiNotes contract on whatever
// network /midnight/.env selects. `pay` always spends exactly 4 existing,
// unspent notes, ALL sharing the same maturesAt — a hard protocol constraint
// (see VinchiNotes.compact's `pay` circuit and its PAY_INPUTS=4 padding
// requirement), not a choice made here.
//
// A first-time payer never has 4 matching notes lying around, so this module
// auto-fills whatever's missing: it deposits directly to the payer's own
// wallet-seed identity (see noteWallet.ts), backs up each new note's
// breadcrumb (noteBackup.ts) so it's immediately spendable, and only then
// builds and submits `pay`. From the caller's side this is still one
// send_pay() call / one "Pay" click — see ensurePayableGroup below for the
// actual top-up logic. Nothing here touches the contracts; this is purely
// frontend orchestration of ordinary deposit + pay transactions.
import { useState, useEffect, type FormEvent } from 'react';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { PublicDataProvider } from '@midnight-ntwrk/midnight-js-types';
import { resolveNetwork, getContractAddress } from './midnight/network';
import { connectWallet } from './midnight/wallet';
import { buildProviders } from './midnight/providers';
import { loadVinchiNotesCompiledContract } from './midnight/compiledContracts';
import { getOrCreateSeed, deriveNullifierKey, deriveNoteNonce, deriveOwnerCommitment } from './midnight/noteWallet';
import { listOwnedNotes, spendableNotes, type OwnedNote } from './midnight/notes';
import { generate_commitment, nextBreadcrumbIndex } from './midnight/noteBackup';
import { queryMerchantRegistryLedger, findMerchantMerklePath } from './midnight/ledgerQueries';

// pay calls nullifierKeyFor (to prove ownership of each input note), so its
// private state isn't the trivial {} shape deposit uses — same
// PRIVATE_STATE_ID convention as send_deposit.tsx regardless, since this
// project's private state is always empty in practice (see
// compiledContracts.ts's throwingWitness / noteWallet.ts's one-key-per-seed
// design — the witness ignores context.privateState entirely).
const PRIVATE_STATE_ID = 'vinchiNotesPrivateState';

/** pay always spends exactly 4 note inputs — see VinchiNotes.compact's `pay` circuit signature. */
const PAY_INPUT_COUNT = 4;

/**
 * Auto-top-up padding notes only need to be nonzero (deposit's contract-level
 * assert requires amount > 0) — their sole job is filling pay's fixed
 * 4-input slot when the payer doesn't have that many real notes yet. 1 STAR
 * is a millionth of a NIGHT: negligible, and it stays spendable afterward
 * (nothing forces it to be "used up" — it just becomes part of this
 * maturesAt group for a future payment too).
 */
const PADDING_NOTE_AMOUNT_STAR = 1n;

/**
 * How far in the future a *freshly chosen* auto-top-up maturesAt is set when
 * there's no existing note group to build on. Only needs to clear deposit's
 * "must be in the future" check with headroom for proof generation + tx
 * submission latency; nothing else depends on this value.
 */
const AUTO_TOPUP_MATURES_AT_OFFSET_SECONDS = 60 * 60;

/**
 * An existing note group is only reused as a top-up target if its maturesAt
 * clears "now" by at least this much — otherwise a `deposit` meant to land
 * a few seconds from now could arrive after maturesAt has already passed and
 * fail deposit's "must be in the future" assert. See the comment in
 * ensurePayableGroup for what happens to a group that fails this check.
 */
const MIN_TOPUP_DEPOSIT_HORIZON_SECONDS = 5 * 60;

export interface PayParams {
  /** Bytes32 hex (with or without 0x) — who receives the payment. */
  merchantOwnerCommitment: string;
  /** Amount going to the merchant; remainder returns to the payer as change. */
  amountStar: bigint;
}

export interface PayResult {
  txId: string;
  blockHeight: number;
}

function parseBytes32(hex: string, label: string): Uint8Array {
  const clean = hex.startsWith('0x') || hex.startsWith('0X') ? hex.slice(2) : hex;
  if (!/^[0-9a-fA-F]{64}$/.test(clean)) {
    throw new Error(`${label} must be 32 bytes (64 hex chars), got "${hex}"`);
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Largest maturesAt-sharing group of spendable notes, or undefined if there are none at all. */
function pickBestGroup(spendable: OwnedNote[]): { maturesAt: bigint; notes: OwnedNote[] } | undefined {
  const groups = new Map<string, OwnedNote[]>();
  for (const note of spendable) {
    const key = note.body.maturesAt.toString();
    const group = groups.get(key);
    if (group) group.push(note);
    else groups.set(key, [note]);
  }
  let best: { maturesAt: bigint; notes: OwnedNote[] } | undefined;
  for (const notes of groups.values()) {
    if (!best || notes.length > best.notes.length) best = { maturesAt: notes[0].body.maturesAt, notes };
  }
  return best;
}

/** True if the first PAY_INPUT_COUNT notes of this group alone cover amountStar. */
function groupIsPayable(notes: OwnedNote[], amountStar: bigint): boolean {
  if (notes.length < PAY_INPUT_COUNT) return false;
  const sum = notes.slice(0, PAY_INPUT_COUNT).reduce((s, n) => s + n.body.amount, 0n);
  return sum >= amountStar;
}

/**
 * Deposits `amountStar` to the payer's own wallet-seed identity and backs up
 * the resulting note's breadcrumb, so it's immediately visible to a
 * subsequent listOwnedNotes() call — same deterministic (seed, index) nonce
 * chain Flujo 6 relies on, unlike send_deposit.tsx's demo form (which uses a
 * random nonce and never backs anything up, by design — it targets an
 * arbitrary recipientOwner, not necessarily this browser's own wallet).
 */
async function selfDeposit(params: {
  seed: Uint8Array;
  myOwnerCommitment: Uint8Array;
  amountStar: bigint;
  maturesAt: bigint;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deployed: any;
}): Promise<void> {
  const { seed, myOwnerCommitment, amountStar, maturesAt, deployed } = params;
  const index = await nextBreadcrumbIndex(seed);
  const nonce = await deriveNoteNonce(seed, index);
  await deployed.callTx.deposit(amountStar, myOwnerCommitment, maturesAt, nonce);
  await generate_commitment({ seed, index, amount: amountStar, maturesAt });
}

/**
 * Returns 4 spendable notes, all sharing a maturesAt, summing to at least
 * amountStar — depositing whatever's missing (to the payer's own identity)
 * first if the payer doesn't already have such a group. Prefers topping up
 * the payer's largest existing maturesAt group over starting a fresh one, so
 * repeated payments don't scatter NIGHT across many small groups.
 *
 * The one case this can't paper over: an existing group that already has all
 * 4 slots filled but doesn't sum to enough — pay's fixed input count means a
 * 5th note can't be added to top it up, so that surfaces as an error instead.
 */
async function ensurePayableGroup(params: {
  seed: Uint8Array;
  myOwnerCommitment: Uint8Array;
  amountStar: bigint;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deployed: any;
  publicDataProvider: PublicDataProvider;
  vinchiNotesAddress: string;
  onProgress?: (message: string) => void;
}): Promise<OwnedNote[]> {
  const { seed, myOwnerCommitment, amountStar, deployed, publicDataProvider, vinchiNotesAddress, onProgress } = params;

  const readSpendable = async () => spendableNotes(await listOwnedNotes(seed, publicDataProvider, vinchiNotesAddress));

  const initial = pickBestGroup(await readSpendable());
  if (initial && groupIsPayable(initial.notes, amountStar)) {
    return initial.notes.slice(0, PAY_INPUT_COUNT);
  }

  // Reusing an existing partial group as the top-up target only works if
  // it's still safely in the future: `deposit` requires maturesAt to be
  // strictly ahead of block time, so a group left over from an earlier pay
  // (e.g. this is the 3rd payment, hours after the 1st) can go stale between
  // calls. Notes already at a stale maturesAt remain perfectly spendable —
  // pay itself has no time check — but nothing more can ever be deposited
  // into that group, so if it's short of 4 notes it would be permanently
  // stuck below the count pay needs. Abandon it as a target in that case and
  // start a fresh group instead; the old notes just wait for a future
  // payment where they alone (or alongside other old notes at that same
  // maturesAt) happen to reach 4.
  const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
  const initialStillDepositable =
    initial !== undefined && initial.maturesAt > nowSeconds + BigInt(MIN_TOPUP_DEPOSIT_HORIZON_SECONDS);

  const targetMaturesAt = initialStillDepositable
    ? initial!.maturesAt
    : BigInt(Math.floor(Date.now() / 1000) + AUTO_TOPUP_MATURES_AT_OFFSET_SECONDS);
  const existing = initialStillDepositable ? initial!.notes : [];
  const existingSum = existing.reduce((s, n) => s + n.body.amount, 0n);
  const neededCount = PAY_INPUT_COUNT - existing.length;

  if (initial && !initialStillDepositable) {
    onProgress?.(
      `Your existing notes mature too soon to top up safely — starting a fresh group ` +
        `(old notes remain spendable once 4 of them line up on their own).`,
    );
  }

  if (neededCount <= 0) {
    throw new Error(
      `You already have ${existing.length} unspent notes sharing a maturity date, but they only total ` +
        `${existingSum} STAR — this payment needs ${amountStar}. pay always spends exactly ${PAY_INPUT_COUNT} ` +
        `notes, so a 5th note can't be added to top this group up; deposit ahead of time with a different ` +
        `maturesAt instead.`,
    );
  }

  const shortfall = amountStar > existingSum ? amountStar - existingSum : 0n;
  onProgress?.(`Not enough notes yet — auto-depositing ${neededCount} more to fill pay's 4-note input.`);
  for (let i = 0; i < neededCount; i++) {
    const depositAmount = i === 0 && shortfall > 0n ? shortfall : PADDING_NOTE_AMOUNT_STAR;
    onProgress?.(`Auto-deposit ${i + 1}/${neededCount} (${depositAmount} STAR)…`);
    // Sequential and awaited: each deposit's breadcrumb must land before
    // nextBreadcrumbIndex() is called again for the next one.
    await selfDeposit({ seed, myOwnerCommitment, amountStar: depositAmount, maturesAt: targetMaturesAt, deployed });
  }

  onProgress?.('Auto-deposits confirmed — rechecking spendable notes…');
  const finalGroup = (await readSpendable()).filter((n) => n.body.maturesAt === targetMaturesAt);
  if (!groupIsPayable(finalGroup, amountStar)) {
    throw new Error('Auto top-up deposits landed but the resulting notes still cannot cover this payment — please retry.');
  }
  return finalGroup.slice(0, PAY_INPUT_COUNT);
}

/**
 * Pays a registered merchant from the connected browser's own note wallet
 * (see noteWallet.ts's deterministic seed derivation), auto-depositing
 * whatever notes are missing first (see ensurePayableGroup). Connects the
 * injected wallet, resolves network + contract addresses from
 * /midnight/.env, and drives the whole build-prove-balance-submit pipeline
 * through the DApp Connector API — see src/midnight/ for each stage.
 *
 * onProgress, if given, is called with a short human-readable status string
 * at each step — useful since a first-time payer's single "Pay" click can
 * now involve several sequential transactions (up to 4 auto-deposits, then
 * pay itself) rather than just one.
 */
export async function send_pay(params: PayParams, onProgress?: (message: string) => void): Promise<PayResult> {
  if (params.amountStar <= 0n) throw new Error('amountStar must be positive');
  const merchantOwnerCommitmentBytes = parseBytes32(params.merchantOwnerCommitment, 'merchantOwnerCommitment');

  const seed = getOrCreateSeed();
  const nullifierKey = await deriveNullifierKey(seed);
  const myOwnerCommitment = await deriveOwnerCommitment(seed);

  const { network, config } = resolveNetwork();
  setNetworkId(network);

  onProgress?.('Connecting wallet…');
  const connectedAPI = await connectWallet(network);

  const providers = await buildProviders(connectedAPI, {
    zkBaseUrl: `${window.location.origin}/zk/VinchiNotes`,
    fallback: config,
  });

  // compiledContracts.ts's VinchiNotesWitnesses type declares every witness
  // as `(...args: never[]) => never` (the shape of the throwing stubs) — too
  // narrow for a real implementation that actually returns a value. Cast
  // through `any` here rather than widen that shared type just for this one
  // caller; deposit's default (all-throwing) witnesses still typecheck fine.
  //
  // Built once, up front: deposit invokes no witness, so this same instance
  // (with the real nullifierKeyFor implementation pay needs) is reused below
  // for any auto-top-up deposits too, instead of standing up the contract
  // binding twice.
  const compiledContract = loadVinchiNotesCompiledContract({
    nullifierKeyFor: ((context: any, _owner: unknown) => [context.privateState, nullifierKey]) as any,
  });

  // The compiled contract's exact generic shape isn't worth fighting the
  // type checker over here — back/contracts/src/cli.ts and deploy.ts already
  // cast the same way for the same reason (see those files), and
  // send_deposit.tsx follows suit for this same project.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deployed: any = await findDeployedContract(providers as any, {
    compiledContract: compiledContract as any,
    contractAddress: getContractAddress('VINCHI_NOTES'),
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState: {},
  });

  const selectedInputs = await ensurePayableGroup({
    seed,
    myOwnerCommitment,
    amountStar: params.amountStar,
    deployed,
    publicDataProvider: providers.publicDataProvider,
    vinchiNotesAddress: getContractAddress('VINCHI_NOTES'),
    onProgress,
  });

  const sumIn = selectedInputs.reduce((sum, n) => sum + n.body.amount, 0n);
  if (sumIn < params.amountStar) {
    // Should be unreachable — ensurePayableGroup only ever returns a group it
    // already verified covers the payment. Kept as a last line of defense.
    throw new Error(
      `Insufficient balance in this maturity group: have ${sumIn} STAR across ${selectedInputs.length} notes, ` +
        `requested ${params.amountStar} STAR.`,
    );
  }
  const changeAmount = sumIn - params.amountStar;
  const sharedMaturesAt = selectedInputs[0].body.maturesAt;

  // Resolve the merchant's Merkle path before building/proving the
  // transaction — fail fast rather than paying proving costs for a doomed tx.
  onProgress?.('Resolving merchant membership proof…');
  const merchantRegistryLedger = await queryMerchantRegistryLedger(
    providers.publicDataProvider,
    getContractAddress('MERCHANT_REGISTRY'),
  );
  const merchantPath = findMerchantMerklePath(merchantRegistryLedger, merchantOwnerCommitmentBytes);
  if (merchantPath === undefined) {
    throw new Error(
      'Recipient is not a registered merchant — register them first ' +
        '(back/contracts: npx tsx src/register-merchant.ts <hex>).',
    );
  }

  const changeIndex = await nextBreadcrumbIndex(seed);
  const changeNonce = await deriveNoteNonce(seed, changeIndex);
  const changeOutput = {
    body: { owner: myOwnerCommitment, amount: changeAmount, maturesAt: sharedMaturesAt, rateBps: 0n, matured: false },
    nonce: changeNonce,
  };

  const isSelfPay = bytesEqual(merchantOwnerCommitmentBytes, myOwnerCommitment);
  let merchantNonce: Uint8Array;
  let merchantIndex: number | undefined;
  if (isSelfPay) {
    // Self-pay test case: derive the merchant note's nonce the same
    // deterministic way as any other note of ours. changeIndex + 1, not a
    // second nextBreadcrumbIndex() call — nothing has been backed up yet at
    // this point, so a second call would return the same stale index.
    merchantIndex = changeIndex + 1;
    merchantNonce = await deriveNoteNonce(seed, merchantIndex);
  } else {
    // Paying a genuinely different owner: their seed isn't ours, so there's
    // no deterministic index to derive from. A random nonce is
    // cryptographically fine for the note itself, but — known, documented
    // limitation — this makes the resulting note essentially undiscoverable
    // by the recipient through this app today: there's no out-of-band nonce
    // delivery mechanism yet. Not a bug to fix here.
    merchantNonce = crypto.getRandomValues(new Uint8Array(32));
  }
  const merchantOutput = {
    body: {
      owner: merchantOwnerCommitmentBytes,
      amount: params.amountStar,
      maturesAt: sharedMaturesAt,
      rateBps: 0n,
      matured: false,
    },
    nonce: merchantNonce,
  };

  const inputs = selectedInputs.map((n) => ({ body: n.body, nonce: n.nonce, path: n.merklePath }));

  onProgress?.('Paying…');
  const tx = await deployed.callTx.pay(inputs, merchantOutput, merchantPath, changeOutput);

  await generate_commitment({ seed, index: changeIndex, amount: changeAmount, maturesAt: sharedMaturesAt });
  if (isSelfPay && merchantIndex !== undefined) {
    await generate_commitment({ seed, index: merchantIndex, amount: params.amountStar, maturesAt: sharedMaturesAt });
  }

  return { txId: tx.public.txId, blockHeight: tx.public.blockHeight };
}

type FormStatus =
  | { kind: 'idle' }
  | { kind: 'pending'; message: string }
  | { kind: 'success'; result: PayResult }
  | { kind: 'error'; message: string };

/** Minimal clickable path to send_pay() for end-to-end validation testing. */
export function PayForm() {
  const [merchantOwnerCommitment, setMerchantOwnerCommitment] = useState('');
  const [amountStar, setAmountStar] = useState('100000');
  const [status, setStatus] = useState<FormStatus>({ kind: 'idle' });

  // Prefill with the payer's own ownerCommitment as a convenience default
  // for self-pay testing — still editable to pay a different registered
  // merchant.
  useEffect(() => {
    (async () => {
      try {
        const seed = getOrCreateSeed();
        const own = await deriveOwnerCommitment(seed);
        setMerchantOwnerCommitment(bytesToHex(own));
      } catch (err) {
        console.error('failed to derive own ownerCommitment for prefill', err);
      }
    })();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus({ kind: 'pending', message: 'Paying…' });
    try {
      const result = await send_pay(
        { merchantOwnerCommitment, amountStar: BigInt(amountStar) },
        (message) => setStatus({ kind: 'pending', message }),
      );
      setStatus({ kind: 'success', result });
    } catch (err) {
      // .message alone is often too thin — midnight-js-contracts wraps
      // submit/execute failures in `new Error(msg, { cause: err })`, and the
      // outer message can collapse to a bare "Error" when the real cause
      // loses its message crossing the wallet extension's postMessage
      // boundary. Log both levels explicitly instead of relying on however
      // devtools chooses to render (or truncate) the cause chain.
      console.error('pay failed:', err);
      if (err instanceof Error && err.cause !== undefined) {
        console.error('pay failed — cause:', err.cause);
      }
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Pay</h2>
      <div>
        <label htmlFor="merchantOwnerCommitment">Merchant owner commitment (32-byte hex)</label>
        <input
          id="merchantOwnerCommitment"
          type="text"
          placeholder="0x…64 hex chars"
          value={merchantOwnerCommitment}
          onChange={(e) => setMerchantOwnerCommitment(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="amountStar">Amount (STAR, 1 NIGHT = 1,000,000 STAR)</label>
        <input
          id="amountStar"
          type="number"
          min="1"
          value={amountStar}
          onChange={(e) => setAmountStar(e.target.value)}
          required
        />
      </div>
      <button type="submit" disabled={status.kind === 'pending'}>
        {status.kind === 'pending' ? 'Paying…' : 'Pay'}
      </button>
      <p>
        If you don't have 4 matching notes yet, this will auto-deposit what's missing first — one click still pays.
      </p>
      {status.kind === 'pending' && <p>{status.message}</p>}
      {status.kind === 'success' && (
        <p>
          Paid. Tx {status.result.txId} at block {status.result.blockHeight}.
        </p>
      )}
      {status.kind === 'error' && <p style={{ color: 'red' }}>{status.message}</p>}
    </form>
  );
}
