// Flujo 1 (depósito): builds, proves, balances (via the connected wallet)
// and submits a `deposit` transaction against the VinchiNotes contract on
// whatever network /midnight/.env selects. NIGHT is unshielded, so the
// amount and the depositor's address are necessarily public on-chain — see
// docs/superpowers context for the threat model this follows.
import { useState, useEffect, type FormEvent } from 'react';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { resolveNetwork, getContractAddress } from './midnight/network';
import { connectWallet } from './midnight/wallet';
import { buildProviders } from './midnight/providers';
import { loadVinchiNotesCompiledContract, computeOwnerCommitment } from './midnight/depositContract';

// deposit calls no witness, so its private state is always {} — same shape
// as back/contracts' hello-world CLI's PRIVATE_STATE_ID convention.
const PRIVATE_STATE_ID = 'vinchiNotesPrivateState';

export interface DepositParams {
  /** NIGHT amount in STAR (1 NIGHT = 1,000,000 STAR), matching the deposit circuit's Uint<128> amount. */
  amountStar: bigint;
  /** Bytes32 hex (with or without 0x) — ownerCommitment(nullifierKey) of whoever should receive the note. */
  recipientOwner: string;
  /** When the resulting lUSDv note matures, as a unix timestamp in seconds. Must be in the future. */
  maturesAt: number | bigint;
}

export interface DepositResult {
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

// Not derived from the wallet: Midnight's signData is intentionally
// non-deterministic (same message + same key still produces a different
// signature every time), so there's no way to reproduce a stable secret from
// a wallet signature. This is instead the pattern Midnight's own example
// dapps use (leaderboard-ui, bboard, zk-loan): a random secret, generated
// once, persisted locally, and reused — never regenerated per action. Keyed
// to this browser, not portable across devices; that's the real scope this
// deposit-only flow needs (spending, which would need genuine cross-device
// recovery per Flujo 6, isn't implemented here).
const RECIPIENT_SECRET_STORAGE_KEY = 'vinchi:recipient-secret';

function loadOrCreateNullifierKey(): Uint8Array {
  const stored = localStorage.getItem(RECIPIENT_SECRET_STORAGE_KEY);
  if (stored) return parseBytes32(stored, 'stored nullifierKey');
  const fresh = crypto.getRandomValues(new Uint8Array(32));
  localStorage.setItem(RECIPIENT_SECRET_STORAGE_KEY, bytesToHex(fresh));
  return fresh;
}

function randomNonce(): Uint8Array {
  // A random 32-byte nonce is enough to keep the deposit commitment
  // unpredictable. This is NOT the deterministic HKDF nonce chain from
  // Flujo 6 (note recovery from seed) — that's wallet-side note management,
  // out of scope here. A note created with a random nonce can't later be
  // rediscovered by re-deriving nonces from a seed.
  return crypto.getRandomValues(new Uint8Array(32));
}

/**
 * Deposits NIGHT into VinchiNotes, minting an lUSDv note for `recipientOwner`.
 * Connects the injected wallet, resolves network + contract address from
 * /midnight/.env, and drives the whole build-prove-balance-submit pipeline
 * through the DApp Connector API — see src/midnight/ for each stage.
 */
export async function send_deposit(params: DepositParams): Promise<DepositResult> {
  if (params.amountStar <= 0n) throw new Error('amountStar must be positive');
  const recipientOwner = parseBytes32(params.recipientOwner, 'recipientOwner');
  const maturesAt =
    typeof params.maturesAt === 'bigint' ? params.maturesAt : BigInt(Math.floor(params.maturesAt));
  const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
  if (maturesAt <= nowSeconds) throw new Error('maturesAt must be in the future');

  const { network, config } = resolveNetwork();
  setNetworkId(network);

  const contractAddress = getContractAddress('VINCHI_NOTES');
  const connectedAPI = await connectWallet(network);

  const providers = await buildProviders(connectedAPI, {
    zkBaseUrl: `${window.location.origin}/zk/VinchiNotes`,
    fallback: config,
  });

  const compiledContract = loadVinchiNotesCompiledContract();

  // The compiled contract's exact generic shape isn't worth fighting the
  // type checker over here — back/contracts/src/cli.ts and deploy.ts already
  // cast the same way for the same reason (see those files).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deployed: any = await findDeployedContract(providers as any, {
    compiledContract: compiledContract as any,
    contractAddress,
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState: {},
  });

  const tx = await deployed.callTx.deposit(params.amountStar, recipientOwner, maturesAt, randomNonce());

  return { txId: tx.public.txId, blockHeight: tx.public.blockHeight };
}

type FormStatus = { kind: 'idle' } | { kind: 'pending' } | { kind: 'success'; result: DepositResult } | { kind: 'error'; message: string };

/** Minimal clickable path to send_deposit() for end-to-end validation testing. */
export function DepositForm() {
  const [amountStar, setAmountStar] = useState('1000000');
  const [recipientOwner, setRecipientOwner] = useState('');
  const [maturesAt, setMaturesAt] = useState('');
  const [status, setStatus] = useState<FormStatus>({ kind: 'idle' });
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);

  // Not a wallet key — nullifierKey is Vinchi's own note-ownership secret
  // (see VinchiNotes.compact's nullifierKeyFor witness). ownerCommitment is a
  // pure circuit (no proof, no witnesses), safe to compute client-side.
  // Mirrors back/contracts/src/generate-recipient.ts for CLI/txt-file use.
  const handleGenerate = () => {
    try {
      const nullifierKey = loadOrCreateNullifierKey();
      const commitment = computeOwnerCommitment(nullifierKey);
      setRecipientOwner(bytesToHex(commitment));
      setGeneratedSecret(bytesToHex(nullifierKey));
    } catch (err) {
      console.error('generate recipient failed', err);
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  };

  // Auto-fill on mount if this browser already has a saved secret, so a
  // returning visitor doesn't have to click Generate again to get back the
  // same recipientOwner they used before.
  useEffect(() => {
    if (localStorage.getItem(RECIPIENT_SECRET_STORAGE_KEY)) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus({ kind: 'pending' });
    try {
      const maturesAtSeconds = maturesAt ? Math.floor(new Date(maturesAt).getTime() / 1000) : NaN;
      if (!Number.isFinite(maturesAtSeconds)) throw new Error('Pick a valid maturesAt date/time.');
      const result = await send_deposit({
        amountStar: BigInt(amountStar),
        recipientOwner,
        maturesAt: maturesAtSeconds,
      });
      setStatus({ kind: 'success', result });
    } catch (err) {
      // .message alone is often too thin — midnight-js-contracts wraps
      // submit/execute failures in `new Error(msg, { cause: err })`, and the
      // outer message can collapse to a bare "Error" when the real cause
      // loses its message crossing the wallet extension's postMessage
      // boundary. Log both levels explicitly instead of relying on however
      // devtools chooses to render (or truncate) the cause chain.
      console.error('deposit failed:', err);
      if (err instanceof Error && err.cause !== undefined) {
        console.error('deposit failed — cause:', err.cause);
      }
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Deposit NIGHT</h2>
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
      <div>
        <label htmlFor="recipientOwner">Recipient owner commitment (32-byte hex)</label>
        <input
          id="recipientOwner"
          type="text"
          placeholder="0x…64 hex chars"
          value={recipientOwner}
          onChange={(e) => setRecipientOwner(e.target.value)}
          required
        />
        <button type="button" onClick={handleGenerate}>
          Generate
        </button>
        {generatedSecret && (
          <p style={{ color: 'darkorange' }}>
            nullifierKey (saved in this browser's localStorage — you'll need it later to prove ownership of this
            note; not portable to another device or browser): {generatedSecret}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="maturesAt">Matures at</label>
        <input
          id="maturesAt"
          type="datetime-local"
          value={maturesAt}
          onChange={(e) => setMaturesAt(e.target.value)}
          required
        />
      </div>
      <button type="submit" disabled={status.kind === 'pending'}>
        {status.kind === 'pending' ? 'Depositing…' : 'Deposit'}
      </button>
      {status.kind === 'success' && (
        <p>
          Deposited. Tx {status.result.txId} at block {status.result.blockHeight}.
        </p>
      )}
      {status.kind === 'error' && <p style={{ color: 'red' }}>{status.message}</p>}
    </form>
  );
}
