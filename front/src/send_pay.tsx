// Flujo 2 (pago): builds, proves, balances (via the connected wallet) and
// submits a `pay` transaction against the VinchiNotes contract on whatever
// network /midnight/.env selects. Spends exactly 4 existing, unspent notes
// (all sharing the same maturesAt — that's a hard protocol constraint, not
// a choice made here — see the CRITICAL comment on selectSpendGroup below),
// producing a merchant-output note and a change-output note back to the
// payer. Mirrors send_deposit.tsx's structure/style closely.
import { useState, useEffect, type FormEvent } from 'react';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
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

/**
 * CRITICAL protocol constraint: `pay` always consumes exactly 4 real notes
 * as inputs, ALL sharing the exact same `maturesAt`, ALL already present in
 * noteTree and ALL unspent. There is no way to fabricate "padding" notes —
 * every input must be a genuine existing note the payer owns. This groups
 * spendable notes by maturesAt and picks the first group with >= 4 members;
 * it does not try to find the "best" group, just a usable one.
 */
function selectSpendGroup(spendable: OwnedNote[]): OwnedNote[] {
  const groups = new Map<string, OwnedNote[]>();
  for (const note of spendable) {
    const key = note.body.maturesAt.toString();
    const group = groups.get(key);
    if (group) group.push(note);
    else groups.set(key, [note]);
  }
  for (const group of groups.values()) {
    if (group.length >= PAY_INPUT_COUNT) return group;
  }
  const sizes = Array.from(groups.values(), (g) => g.length);
  throw new Error(
    `Paying requires ${PAY_INPUT_COUNT} unspent notes sharing the same maturity date. ` +
      `You have: [${sizes.join(', ')}]. Make more deposits with a matching maturesAt first.`,
  );
}

/**
 * Pays a registered merchant from the connected browser's own note wallet
 * (see noteWallet.ts's deterministic seed derivation). Connects the
 * injected wallet, resolves network + contract addresses from
 * /midnight/.env, and drives the whole build-prove-balance-submit pipeline
 * through the DApp Connector API — see src/midnight/ for each stage.
 */
export async function send_pay(params: PayParams): Promise<PayResult> {
  if (params.amountStar <= 0n) throw new Error('amountStar must be positive');
  const merchantOwnerCommitmentBytes = parseBytes32(params.merchantOwnerCommitment, 'merchantOwnerCommitment');

  const seed = getOrCreateSeed();
  const nullifierKey = await deriveNullifierKey(seed);
  const myOwnerCommitment = await deriveOwnerCommitment(seed);

  const { network, config } = resolveNetwork();
  setNetworkId(network);

  const connectedAPI = await connectWallet(network);

  const providers = await buildProviders(connectedAPI, {
    zkBaseUrl: `${window.location.origin}/zk/VinchiNotes`,
    fallback: config,
  });

  const notes = await listOwnedNotes(seed, providers.publicDataProvider, getContractAddress('VINCHI_NOTES'));
  const spendable = spendableNotes(notes);
  const group = selectSpendGroup(spendable);
  const selectedInputs = group.slice(0, PAY_INPUT_COUNT);

  const sumIn = selectedInputs.reduce((sum, n) => sum + n.body.amount, 0n);
  if (sumIn < params.amountStar) {
    throw new Error(
      `Insufficient balance in this maturity group: have ${sumIn} STAR across ${selectedInputs.length} notes, ` +
        `requested ${params.amountStar} STAR.`,
    );
  }
  const changeAmount = sumIn - params.amountStar;
  const sharedMaturesAt = selectedInputs[0].body.maturesAt;

  // Resolve the merchant's Merkle path before building/proving the
  // transaction — fail fast rather than paying proving costs for a doomed tx.
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

  // compiledContracts.ts's VinchiNotesWitnesses type declares every witness
  // as `(...args: never[]) => never` (the shape of the throwing stubs) — too
  // narrow for a real implementation that actually returns a value. Cast
  // through `any` here rather than widen that shared type just for this one
  // caller; deposit's default (all-throwing) witnesses still typecheck fine.
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

  const inputs = selectedInputs.map((n) => ({ body: n.body, nonce: n.nonce, path: n.merklePath }));

  const tx = await deployed.callTx.pay(inputs, merchantOutput, merchantPath, changeOutput);

  await generate_commitment({ seed, index: changeIndex, amount: changeAmount, maturesAt: sharedMaturesAt });
  if (isSelfPay && merchantIndex !== undefined) {
    await generate_commitment({ seed, index: merchantIndex, amount: params.amountStar, maturesAt: sharedMaturesAt });
  }

  return { txId: tx.public.txId, blockHeight: tx.public.blockHeight };
}

type FormStatus = { kind: 'idle' } | { kind: 'pending' } | { kind: 'success'; result: PayResult } | { kind: 'error'; message: string };

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
    setStatus({ kind: 'pending' });
    try {
      const result = await send_pay({
        merchantOwnerCommitment,
        amountStar: BigInt(amountStar),
      });
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
      {status.kind === 'success' && (
        <p>
          Paid. Tx {status.result.txId} at block {status.result.blockHeight}.
        </p>
      )}
      {status.kind === 'error' && <p style={{ color: 'red' }}>{status.message}</p>}
    </form>
  );
}
