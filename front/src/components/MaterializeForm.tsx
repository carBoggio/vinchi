// MOCK: Flujo 3 (materialización) has no frontend wrapper yet — VinchiNotes'
// `materialize` circuit exists (see midnight/generated/VinchiNotes), but
// nothing in this repo calls it from the browser. This form exists so the
// tab isn't empty; it simulates success after a short delay instead of
// building/proving/submitting a real transaction. Replace the body of
// handleSubmit with a real deployed.callTx.materialize(...) call (same
// pattern as send_deposit.tsx / send_pay.tsx) once that wrapper exists.
import { useState, type FormEvent } from 'react';

type FormStatus =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'success'; txId: string; blockHeight: number }
  | { kind: 'error'; message: string };

function fakeTxId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function MaterializeForm() {
  const [noteCommitment, setNoteCommitment] = useState('');
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
      <h2>Materialize</h2>
      <p className="mock-notice">Simulated — not yet wired to the materialize circuit.</p>
      <div>
        <label htmlFor="noteCommitment">Note commitment (32-byte hex)</label>
        <input
          id="noteCommitment"
          type="text"
          placeholder="0x…64 hex chars"
          value={noteCommitment}
          onChange={(e) => setNoteCommitment(e.target.value)}
          required
        />
      </div>
      <button type="submit" disabled={status.kind === 'pending'}>
        {status.kind === 'pending' ? 'Materializing…' : 'Materialize'}
      </button>
      {status.kind === 'success' && (
        <p>
          Materialized. Tx {status.txId} at block {status.blockHeight}.
        </p>
      )}
      {status.kind === 'error' && <p style={{ color: 'red' }}>{status.message}</p>}
    </form>
  );
}
