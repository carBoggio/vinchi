// Fixed strip above the tabs — always visible regardless of which tab is
// active. Reuses exactly the same connect/disconnect state and handlers
// App.tsx already owned (moved here, not rewritten) plus the same
// balance-reading path NotesView already uses (get_notes + spendableNotes +
// totalSpendableLusdv from midnight/notes.ts), fetched independently so the
// header doesn't depend on the Notes tab being mounted.
import { useCallback, useEffect, useState } from 'react';
import { get_notes } from '../get_notes';
import { totalSpendableLusdv } from '../midnight/notes';

export interface WalletHeaderProps {
  isConnected: boolean;
  walletAddress: string | null;
  error: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function WalletHeader({ isConnected, walletAddress, error, onConnect, onDisconnect }: WalletHeaderProps) {
  const [balance, setBalance] = useState<bigint | null>(null);

  const loadBalance = useCallback(async () => {
    try {
      const notes = await get_notes();
      setBalance(totalSpendableLusdv(notes));
    } catch (err) {
      console.error('WalletHeader balance load failed:', err);
    }
  }, []);

  useEffect(() => {
    if (isConnected) loadBalance();
  }, [isConnected, loadBalance]);

  return (
    <header className="wallet-header">
      <div className="wallet-header__mark" aria-hidden="true">
        <span className="wallet-header__stub" />
        <span className="wallet-header__stub" />
        <span className="wallet-header__stub" />
      </div>
      <div className="wallet-header__body">
        {isConnected && walletAddress ? (
          <>
            <div className="wallet-header__facts">
              {balance !== null && (
                <p className="wallet-header__balance">
                  <strong>{balance.toString()} lUSDv</strong> spendable
                </p>
              )}
              <p className="wallet-header__address">Connected: {walletAddress}</p>
            </div>
            <button type="button" onClick={onDisconnect}>
              Disconnect
            </button>
          </>
        ) : (
          <button type="button" onClick={onConnect}>
            Connect Wallet
          </button>
        )}
      </div>
      {error && <p className="wallet-header__error">{error}</p>}
    </header>
  );
}
