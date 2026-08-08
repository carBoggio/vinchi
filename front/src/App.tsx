import { useState } from 'react';
import './App.css';
import { selectWallet } from './selectWallet';
import { DepositForm } from './send_deposit';
import { PayForm } from './send_pay';
import { NotesView } from './get_notes';
import { resolveNetwork } from './midnight/network';
import { WalletHeader } from './components/WalletHeader';
import { Tabs } from './components/Tabs';
import { MaterializeForm } from './components/MaterializeForm';
import { WithdrawForm } from './components/WithdrawForm';

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
      <WalletHeader
        isConnected={isConnected}
        walletAddress={walletAddress}
        error={error}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />
      {isConnected && (
        <Tabs
          tabs={[
            { id: 'notes', label: 'Notes', content: <NotesView /> },
            { id: 'deposit', label: 'Deposit', content: <DepositForm /> },
            { id: 'pay', label: 'Pay', content: <PayForm /> },
            { id: 'materialize', label: 'Materialize', content: <MaterializeForm /> },
            { id: 'withdraw', label: 'Withdraw', content: <WithdrawForm /> },
          ]}
        />
      )}
    </div>
  );
}

export default App;
