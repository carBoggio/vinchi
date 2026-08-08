// Network + contract-address resolution for the browser dapp. Mirrors
// back/contracts/src/network.ts's NetworkId/NETWORK_CONFIGS shape so the two
// halves of the project agree on what each network means, but this module
// reads from Vite's import.meta.env instead of Node's process.env/fs — the
// browser has neither.
//
// Single source of truth: /midnight/.env (see vite.config.ts's envDir +
// envPrefix). MIDNIGHT_NETWORK, VINCHI_NOTES_ADDRESS and
// MERCHANT_REGISTRY_ADDRESS are the exact variable names back/contracts
// already reads/writes — do not rename them here.

export type NetworkId = 'undeployed' | 'preview' | 'preprod';

export const NETWORK_IDS: readonly NetworkId[] = ['undeployed', 'preview', 'preprod'] as const;

export interface NetworkConfig {
  networkId: NetworkId;
  indexer: string;
  indexerWS: string;
  node: string;
  proofServer: string;
}

// Fallback endpoints, used when the connected wallet doesn't report its own
// (or for 'undeployed', where a real wallet extension has no meaningful
// opinion about a docker-compose stack on localhost). Kept in sync by hand
// with back/contracts/src/network.ts's NETWORK_CONFIGS.
export const NETWORK_CONFIGS: Record<NetworkId, NetworkConfig> = {
  undeployed: {
    networkId: 'undeployed',
    indexer: 'http://127.0.0.1:8088/api/v4/graphql',
    indexerWS: 'ws://127.0.0.1:8088/api/v4/graphql/ws',
    node: 'http://127.0.0.1:9944',
    proofServer: 'http://127.0.0.1:6300',
  },
  preview: {
    networkId: 'preview',
    indexer: 'https://indexer.preview.midnight.network/api/v4/graphql',
    indexerWS: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
    node: 'https://rpc.preview.midnight.network',
    proofServer: 'http://127.0.0.1:6300',
  },
  preprod: {
    networkId: 'preprod',
    indexer: 'https://indexer.preprod.midnight.network/api/v4/graphql',
    indexerWS: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
    node: 'https://rpc.preprod.midnight.network',
    proofServer: 'http://127.0.0.1:6300',
  },
};

export function isNetworkId(v: unknown): v is NetworkId {
  return typeof v === 'string' && (NETWORK_IDS as readonly string[]).includes(v);
}

export interface ResolvedNetwork {
  network: NetworkId;
  config: NetworkConfig;
}

/** Reads MIDNIGHT_NETWORK from /midnight/.env; defaults to 'undeployed' when unset. */
export function resolveNetwork(): ResolvedNetwork {
  const raw = import.meta.env.MIDNIGHT_NETWORK;
  const network = raw === undefined || raw === '' ? 'undeployed' : raw;
  if (!isNetworkId(network)) {
    throw new Error(
      `Unknown MIDNIGHT_NETWORK in /midnight/.env: "${network}". Supported: ${NETWORK_IDS.join(', ')}.`,
    );
  }
  return { network, config: NETWORK_CONFIGS[network] };
}

export type ContractName = 'VINCHI_NOTES' | 'MERCHANT_REGISTRY';

/**
 * Reads <name>_ADDRESS from /midnight/.env for the currently selected
 * network. Throws with an actionable message if it's unset — that happens
 * for real whenever a contract hasn't been deployed on the active network
 * yet (see back/contracts/src/deploy-address.ts).
 */
export function getContractAddress(name: ContractName): string {
  const value = name === 'VINCHI_NOTES' ? import.meta.env.VINCHI_NOTES_ADDRESS : import.meta.env.MERCHANT_REGISTRY_ADDRESS;
  if (!value) {
    const { network } = resolveNetwork();
    throw new Error(
      `${name}_ADDRESS is not set in /midnight/.env for network "${network}". ` +
        `Deploy it first (back/contracts: npx tsx src/deploy-address.ts ${name === 'VINCHI_NOTES' ? 'VinchiNotes' : 'MerchantRegistry'}) ` +
        'and copy the printed address into the root .env.',
    );
  }
  return value;
}
