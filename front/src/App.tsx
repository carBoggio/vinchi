import { useState } from 'react';
import './App.css';
import { selectWallet } from './selectWallet';
import { DepositForm } from './send_deposit';
import { PayForm } from './send_pay';
import { NotesView } from './get_notes';
import { resolveNetwork } from './midnight/network';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setError(null);
    try {
      const wallet = selectWallet();
      const { network } = resolveNetwork();
      const connectedApi = await wallet.connect(network);
      const { unshieldedAddress } = await connectedApi.getUnshieldedAddress();
      setWalletAddress(unshieldedAddress);
      setIsConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setIsConnected(false);
      setWalletAddress(null);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setWalletAddress(null);
  };

  return (
    <div>
      <h1>Midnight Wallet Connector</h1>
      <div>
        {isConnected && walletAddress ? (
          <>
            <p>Connected: {walletAddress}</p>
            <button onClick={handleDisconnect}>Disconnect</button>
          </>
        ) : (
          <button onClick={handleConnect}>Connect Wallet</button>
        )}
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {isConnected && (
        <>
          <NotesView />
          <DepositForm />
          <PayForm />
        </>
      )}
    </div>
  );
}

export default App;
