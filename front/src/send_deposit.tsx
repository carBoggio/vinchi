import { useState, useEffect, type FormEvent } from 'react';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { resolveNetwork, getContractAddress } from './midnight/network';
import { connectWallet } from './midnight/wallet';
import { buildProviders } from './midnight/providers';
import { loadVinchiNotesCompiledContract, computeOwnerCommitment } from './midnight/depositContract';
import { 
  ArrowRight, 
  ShieldCheck, 
  Copy, 
  Check, 
  Clock, 
  Coins, 
  Key, 
  AlertCircle,
  Loader2,
  Sparkles
} from 'lucide-react';

const PRIVATE_STATE_ID = 'vinchiNotesPrivateState';

export interface DepositParams {
  amountStar: bigint;
  recipientOwner: string;
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

const RECIPIENT_SECRET_STORAGE_KEY = 'vinchi:recipient-secret';

function loadOrCreateNullifierKey(): Uint8Array {
  const stored = localStorage.getItem(RECIPIENT_SECRET_STORAGE_KEY);
  if (stored) return parseBytes32(stored, 'stored nullifierKey');
  const fresh = crypto.getRandomValues(new Uint8Array(32));
  localStorage.setItem(RECIPIENT_SECRET_STORAGE_KEY, bytesToHex(fresh));
  return fresh;
}

function randomNonce(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

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

export function DepositForm() {
  const [amountStar, setAmountStar] = useState('1000000');
  const [recipientOwner, setRecipientOwner] = useState('');
  const [maturesAt, setMaturesAt] = useState('');
  const [status, setStatus] = useState<FormStatus>({ kind: 'idle' });
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedTx, setCopiedTx] = useState(false);
  const [selectedApy, setSelectedApy] = useState('6.42% APY (Standard Vault)');
  const [selectedPeriod, setSelectedPeriod] = useState('7 Days Lock');

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

  useEffect(() => {
    if (localStorage.getItem(RECIPIENT_SECRET_STORAGE_KEY)) {
      handleGenerate();
    }
    const inSevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const formatted = inSevenDays.toISOString().slice(0, 16);
    setMaturesAt(formatted);
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
      console.error('deposit failed:', err);
      if (err instanceof Error && err.cause !== undefined) {
        console.error('deposit failed — cause:', err.cause);
      }
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  };

  const copyToClipboard = (text: string, type: 'secret' | 'tx') => {
    navigator.clipboard.writeText(text);
    if (type === 'secret') {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedTx(true);
      setTimeout(() => setCopiedTx(false), 2000);
    }
  };

  const nightEquivalent = (Number(amountStar || 0) / 1_000_000).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
      <div className="flex items-center justify-between pb-5 border-b border-[#1F2937]">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Coins className="w-5 h-5 text-blue-500" /> Deposit Operations
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Deposit NIGHT collateral to mint privacy-preserving lUSDv yield notes.
          </p>
        </div>
        <span className="px-3 py-1 text-xs font-mono rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" /> ZK-Protected
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Deposit Amount Input */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <label htmlFor="amountStar" className="font-semibold text-slate-300">
              Deposit Amount (STAR)
            </label>
            <span className="text-slate-400 font-mono">
              ≈ <strong className="text-blue-400">{nightEquivalent}</strong> NIGHT
            </span>
          </div>
          <div className="relative">
            <input
              id="amountStar"
              type="number"
              min="1"
              value={amountStar}
              onChange={(e) => setAmountStar(e.target.value)}
              required
              className="w-full bg-[#070B14] border border-[#1F2937] rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono text-sm transition-colors"
              placeholder="e.g. 1000000"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAmountStar('1000000')}
                className="px-2.5 py-1 text-[11px] font-medium uppercase rounded-lg bg-[#151D2E] hover:bg-[#1E293B] text-slate-300 border border-[#1F2937] transition-colors"
              >
                1 NIGHT
              </button>
              <button
                type="button"
                onClick={() => setAmountStar('10000000')}
                className="px-2.5 py-1 text-[11px] font-medium uppercase rounded-lg bg-[#151D2E] hover:bg-[#1E293B] text-slate-300 border border-[#1F2937] transition-colors"
              >
                10 NIGHT
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">1 NIGHT = 1,000,000 STAR (Midnight deposit circuit Uint&lt;128&gt;).</p>
        </div>

        {/* Select Period & Select APY Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">Lock Period</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full bg-[#070B14] border border-[#1F2937] rounded-xl px-3.5 py-2.5 text-slate-200 text-xs focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="7 Days Lock">7 Days Lock</option>
              <option value="30 Days Lock">30 Days Lock</option>
              <option value="90 Days Lock">90 Days Lock</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">Target Yield APY</label>
            <select
              value={selectedApy}
              onChange={(e) => setSelectedApy(e.target.value)}
              className="w-full bg-[#070B14] border border-[#1F2937] rounded-xl px-3.5 py-2.5 text-slate-200 text-xs focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="6.42% APY (Standard Vault)">6.42% APY (Standard Vault)</option>
              <option value="8.10% APY (Institutional Vault)">8.10% APY (Institutional Vault)</option>
            </select>
          </div>
        </div>

        {/* Recipient Owner Commitment Input */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <label htmlFor="recipientOwner" className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-slate-400" /> Recipient Owner Commitment (32-byte hex)
            </label>
            <button
              type="button"
              onClick={handleGenerate}
              className="text-blue-400 hover:text-blue-300 text-xs font-medium flex items-center gap-1 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" /> Auto-Generate
            </button>
          </div>
          <div className="relative">
            <input
              id="recipientOwner"
              type="text"
              placeholder="0x…64 hex characters"
              value={recipientOwner}
              onChange={(e) => setRecipientOwner(e.target.value)}
              required
              className="w-full bg-[#070B14] border border-[#1F2937] rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono text-xs transition-colors pr-28"
            />
            <button
              type="button"
              onClick={handleGenerate}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#151D2E] hover:bg-[#1E293B] border border-[#1F2937] text-slate-200 rounded-lg text-xs font-medium transition-colors"
            >
              Generate
            </button>
          </div>

          {generatedSecret && (
            <div className="mt-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-medium text-amber-400">
                <span className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" /> Local Nullifier Key
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(generatedSecret, 'secret')}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-colors text-[11px]"
                >
                  {copiedSecret ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedSecret ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="font-mono text-[11px] break-all bg-black/40 p-2 rounded-lg border border-amber-500/20 text-amber-100">
                {generatedSecret}
              </p>
              <p className="text-[10px] text-amber-300/80">
                Saved in browser storage. Required later to prove note ownership.
              </p>
            </div>
          )}
        </div>

        {/* Maturity Date Input */}
        <div className="space-y-2">
          <label htmlFor="maturesAt" className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" /> Maturity Date/Time
          </label>
          <input
            id="maturesAt"
            type="datetime-local"
            value={maturesAt}
            onChange={(e) => setMaturesAt(e.target.value)}
            required
            className="w-full bg-[#070B14] border border-[#1F2937] rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 font-mono text-sm transition-colors"
          />
        </div>

        {/* Summary Card */}
        <div className="bg-[#151D2E] p-4 rounded-xl border border-[#1F2937] space-y-2 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Estimated lUSDv Minted:</span>
            <span className="font-mono font-bold text-slate-200">{nightEquivalent} lUSDv</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Collateral Guarantee:</span>
            <span className="font-mono font-bold text-emerald-400">185.4% Ratio</span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={status.kind === 'pending'}
          className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
        >
          {status.kind === 'pending' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating Proof & Submitting…</span>
            </>
          ) : (
            <>
              <span>Execute Deposit</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Status Alerts */}
        {status.kind === 'success' && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <Check className="w-4 h-4" /> Deposit Transaction Confirmed
            </div>
            <p>Transaction ID: <span className="font-mono text-slate-200">{status.result.txId}</span></p>
            <p>Confirmed Block: <span className="font-mono text-blue-400">{status.result.blockHeight}</span></p>
            <button
              type="button"
              onClick={() => copyToClipboard(status.result.txId, 'tx')}
              className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              {copiedTx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copiedTx ? 'Copied Tx ID' : 'Copy Hash'}
            </button>
          </div>
        )}

        {status.kind === 'error' && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-200">Execution Failure</p>
              <p className="text-rose-300/90 font-mono text-[11px] mt-0.5 break-all">{status.message}</p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
