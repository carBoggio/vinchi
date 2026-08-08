// Wires up the 6 midnight-js providers for a browser dapp. Follows the
// pattern from Midnight's own browser-dapp tutorials (leaderboard-ui,
// bboard-ui): walletProvider/midnightProvider bridge to the DApp Connector
// API's balanceUnsealedTransaction/submitTransaction, everything else talks
// straight to the network the connected wallet is configured for (falling
// back to NETWORK_CONFIGS only where the wallet doesn't report a value —
// see providers docs on why: it's meant to respect the user's own wallet
// settings, e.g. a privacy-preferred proof server).
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import type { MidnightProviders, PrivateStateId, UnboundTransaction } from '@midnight-ntwrk/midnight-js-types';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { toHex, fromHex } from '@midnight-ntwrk/midnight-js-utils';
import { Transaction, type FinalizedTransaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';

import type { NetworkConfig } from './network';
import { inMemoryPrivateStateProvider } from './inMemoryPrivateStateProvider';

export interface BuildProvidersOptions {
  /** Base URL serving <circuitId>.prover/.verifier/.bzkir under keys/ and zkir/ (see scripts/sync-zk-config.mjs). */
  zkBaseUrl: string;
  /** Used only where the connected wallet doesn't report its own endpoint. */
  fallback: NetworkConfig;
}

export async function buildProviders<K extends string, PSI extends PrivateStateId = PrivateStateId, PS = unknown>(
  connectedAPI: ConnectedAPI,
  { zkBaseUrl, fallback }: BuildProvidersOptions,
): Promise<MidnightProviders<K, PSI, PS>> {
  const [config, shieldedAddresses] = await Promise.all([
    connectedAPI.getConfiguration(),
    connectedAPI.getShieldedAddresses(),
  ]);

  // fetchFunc must be explicitly bound: FetchZkConfigProvider defaults to a
  // bare reference to the global `fetch` (options.fetchFunc ?? fetch), and
  // calling that as `this.fetchFunc(...)` loses its required `this === window`
  // binding — native fetch throws "Illegal invocation" otherwise. Matches
  // Midnight's own leaderboard-ui browser-dapp tutorial exactly.
  const zkConfigProvider = new FetchZkConfigProvider<K>(zkBaseUrl, fetch.bind(window));
  const proofServerUri = config.proverServerUri ?? fallback.proofServer;

  return {
    privateStateProvider: inMemoryPrivateStateProvider<PSI, PS>(),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(proofServerUri, zkConfigProvider),
    publicDataProvider: indexerPublicDataProvider(
      config.indexerUri ?? fallback.indexer,
      config.indexerWsUri ?? fallback.indexerWS,
    ),
    walletProvider: {
      getCoinPublicKey: () => shieldedAddresses.shieldedCoinPublicKey,
      getEncryptionPublicKey: () => shieldedAddresses.shieldedEncryptionPublicKey,
      balanceTx: async (tx: UnboundTransaction): Promise<FinalizedTransaction> => {
        const balanced = await connectedAPI.balanceUnsealedTransaction(toHex(tx.serialize()));
        return Transaction.deserialize('signature', 'proof', 'binding', fromHex(balanced.tx));
      },
    },
    midnightProvider: {
      submitTx: async (tx: FinalizedTransaction) => {
        await connectedAPI.submitTransaction(toHex(tx.serialize()));
        return tx.identifiers()[0];
      },
    },
  };
}
