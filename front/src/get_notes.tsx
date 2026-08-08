// Flujo 6 (recuperación de notas): read-only view of every note this
// browser's wallet seed can prove ownership of. Reading VinchiNotes' public
// ledger state needs no connected wallet — the chain only ever stores a
// note's commitment hash, never its contents ("la cadena guarda huellas, no
// contenido"), so listOwnedNotes() reconstructs candidates locally from the
// seed and checks each one against the public indexer.
import { useCallback, useEffect, useState } from 'react';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { resolveNetwork, getContractAddress } from './midnight/network';
import { getOrCreateSeed } from './midnight/noteWallet';
import { listOwnedNotes, spendableNotes, totalSpendableLusdv, type OwnedNote } from './midnight/notes';

export type { OwnedNote } from './midnight/notes';

/**
 * Every note the current browser's wallet seed can prove ownership of,
 * confirmed on-chain (present in noteTree) or not, spent or not — see
 * midnight/notes.ts's listOwnedNotes for the on-chain checks performed.
 * Read-only: no wallet connection required, since VinchiNotes' ledger state
 * is public.
 */
export async function get_notes(): Promise<OwnedNote[]> {
  const seed = getOrCreateSeed();
  const { config } = resolveNetwork();
  const publicDataProvider = indexerPublicDataProvider(config.indexer, config.indexerWS);
  const vinchiNotesAddress = getContractAddress('VINCHI_NOTES');
  return listOwnedNotes(seed, publicDataProvider, vinchiNotesAddress);
}

type NotesStatus =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'data'; notes: OwnedNote[] };

/** Displays the connected seed's spendable lUSDv balance and note list. */
export function NotesView() {
  const [status, setStatus] = useState<NotesStatus>({ kind: 'loading' });

  const load = useCallback(async () => {
    setStatus({ kind: 'loading' });
    try {
      const notes = await get_notes();
      setStatus({ kind: 'data', notes });
    } catch (err) {
      console.error('get_notes failed:', err);
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h2>Your notes</h2>
      <button type="button" onClick={load} disabled={status.kind === 'loading'}>
        {status.kind === 'loading' ? 'Refreshing…' : 'Refresh'}
      </button>
      {status.kind === 'loading' && <p>Loading notes…</p>}
      {status.kind === 'error' && <p style={{ color: 'red' }}>{status.message}</p>}
      {status.kind === 'data' && (
        <NotesList notes={status.notes} />
      )}
    </div>
  );
}

function NotesList({ notes }: { notes: OwnedNote[] }) {
  const spendable = spendableNotes(notes);
  const total = totalSpendableLusdv(notes);
  const unspendableCount = notes.length - spendable.length;

  return (
    <div>
      <p>
        <strong>{total.toString()} lUSDv</strong> spendable
      </p>
      {spendable.length === 0 ? (
        <p>No spendable notes.</p>
      ) : (
        <ul>
          {spendable.map((note) => (
            <li key={note.index}>
              {note.body.amount.toString()} lUSDv — matures at{' '}
              {new Date(Number(note.body.maturesAt) * 1000).toLocaleString()}
            </li>
          ))}
        </ul>
      )}
      {unspendableCount > 0 && <p>{unspendableCount} notes not yet spendable</p>}
    </div>
  );
}
