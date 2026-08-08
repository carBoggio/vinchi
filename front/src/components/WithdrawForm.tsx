// MOCK: Flujo 4 (retiro) has no frontend wrapper yet — VinchiNotes' `redeem`
// circuit exists (see midnight/generated/VinchiNotes), but nothing in this
// repo calls it from the browser. This form exists so the tab isn't empty;
// it simulates success after a short delay instead of building/proving/
// submitting a real transaction. Replace the body of handleSubmit with a
// real deployed.callTx.redeem(...) call (same pattern as send_deposit.tsx /
// send_pay.tsx) once that wrapper exists.
import { useState, type FormEvent } from 'react';

type FormStatus =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'success'; txId: string; blockHeight: number }
  | { kind: 'error'; message: string };

function fakeTxId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function WithdrawForm() {
  const [noteCommitment, setNoteCommitment] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [status, setStatus] = useState<FormStatus>({ kind: 'idle' });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus({ kind: 'pending' });
    try {
      // MOCK: no contract call — simulated latency + fabricated result.
      await new Promise((resolve) => setTimeout(resolve, 900));
      setStatus({ kind: 'success', txId: fakeTxId(), blockHeight: Math.floor(Math.random() * 100000) });
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Withdraw</h2>
      <p className="mock-notice">Simulated — not yet wired to the redeem circuit.</p>
      <div>
        <label htmlFor="noteCommitment">Matured note commitment (32-byte hex)</label>
        <input
          id="noteCommitment"
          type="text"
          placeholder="0x…64 hex chars"
          value={noteCommitment}
          onChange={(e) => setNoteCommitment(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="destinationAddress">Destination NIGHT address (unshielded)</label>
        <input
          id="destinationAddress"
          type="text"
          placeholder="mn_addr_…"
          value={destinationAddress}
          onChange={(e) => setDestinationAddress(e.target.value)}
          required
        />
      </div>
      <button type="submit" disabled={status.kind === 'pending'}>
        {status.kind === 'pending' ? 'Withdrawing…' : 'Withdraw'}
      </button>
      {status.kind === 'success' && (
        <p>
          Withdrawn. Tx {status.txId} at block {status.blockHeight}.
        </p>
      )}
      {status.kind === 'error' && <p style={{ color: 'red' }}>{status.message}</p>}
    </form>
  );
}
