// Minimal in-memory PrivateStateProvider for the browser. midnight-js-contracts
// requires one to build providers, but VinchiNotes's `deposit` circuit has no
// witnesses and touches no private state — this exists to satisfy the type
// contract, not to persist anything meaningful. Deliberately NOT the
// @midnight-ntwrk/testkit-js version: that package is Node/test-oriented and
// pulls Node's `crypto` module into the bundle, which is wrong for a
// production browser dapp. Matches the pattern used by Midnight's own
// browser-dapp tutorials (leaderboard-ui, bboard-ui), including the
// export/import methods being unencrypted placeholders — there is nothing
// secret in an empty store.
import type {
  ContractAddress,
  SigningKey,
} from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  type ExportPrivateStatesOptions,
  type ExportSigningKeysOptions,
  type ImportPrivateStatesOptions,
  type ImportPrivateStatesResult,
  type ImportSigningKeysOptions,
  type ImportSigningKeysResult,
  type PrivateStateExport,
  type PrivateStateId,
  type PrivateStateProvider,
  type SigningKeyExport,
} from '@midnight-ntwrk/midnight-js-types';

export function inMemoryPrivateStateProvider<
  PSI extends PrivateStateId = PrivateStateId,
  PS = unknown,
>(): PrivateStateProvider<PSI, PS> {
  const privateStates = new Map<ContractAddress, Map<PSI, PS>>();
  const signingKeys = new Map<ContractAddress, SigningKey>();
  let contractAddress: ContractAddress | null = null;

  const requireContractAddress = (): ContractAddress => {
    if (contractAddress === null) {
      throw new Error('Contract address not set. Call setContractAddress() before accessing private state.');
    }
    return contractAddress;
  };

  const scopedStates = (address: ContractAddress): Map<PSI, PS> => {
    let states = privateStates.get(address);
    if (!states) {
      states = new Map<PSI, PS>();
      privateStates.set(address, states);
    }
    return states;
  };

  return {
    setContractAddress(address: ContractAddress): void {
      contractAddress = address;
    },
    set(key: PSI, state: PS): Promise<void> {
      scopedStates(requireContractAddress()).set(key, state);
      return Promise.resolve();
    },
    get(key: PSI): Promise<PS | null> {
      return Promise.resolve(scopedStates(requireContractAddress()).get(key) ?? null);
    },
    remove(key: PSI): Promise<void> {
      scopedStates(requireContractAddress()).delete(key);
      return Promise.resolve();
    },
    clear(): Promise<void> {
      privateStates.delete(requireContractAddress());
      return Promise.resolve();
    },
    setSigningKey(address: ContractAddress, signingKey: SigningKey): Promise<void> {
      signingKeys.set(address, signingKey);
      return Promise.resolve();
    },
    getSigningKey(address: ContractAddress): Promise<SigningKey | null> {
      return Promise.resolve(signingKeys.get(address) ?? null);
    },
    removeSigningKey(address: ContractAddress): Promise<void> {
      signingKeys.delete(address);
      return Promise.resolve();
    },
    clearSigningKeys(): Promise<void> {
      signingKeys.clear();
      return Promise.resolve();
    },
    exportPrivateStates(_options?: ExportPrivateStatesOptions): Promise<PrivateStateExport> {
      const address = requireContractAddress();
      const states = Object.fromEntries(scopedStates(address).entries());
      return Promise.resolve({
        format: 'midnight-private-state-export',
        encryptedPayload: JSON.stringify(states),
        salt: 'in-memory',
      });
    },
    importPrivateStates(
      exportData: PrivateStateExport,
      options?: ImportPrivateStatesOptions,
    ): Promise<ImportPrivateStatesResult> {
      const address = requireContractAddress();
      const strategy = options?.conflictStrategy ?? 'error';
      const incoming = JSON.parse(exportData.encryptedPayload) as Record<string, PS>;
      const states = scopedStates(address);
      let imported = 0;
      let skipped = 0;
      let overwritten = 0;
      for (const [id, value] of Object.entries(incoming)) {
        const key = id as PSI;
        if (states.has(key)) {
          if (strategy === 'skip') {
            skipped++;
            continue;
          }
          if (strategy === 'error') {
            return Promise.reject(new Error(`Conflict importing private state "${id}"`));
          }
          overwritten++;
        } else {
          imported++;
        }
        states.set(key, value);
      }
      return Promise.resolve({ imported, skipped, overwritten });
    },
    exportSigningKeys(_options?: ExportSigningKeysOptions): Promise<SigningKeyExport> {
      return Promise.resolve({
        format: 'midnight-signing-key-export',
        encryptedPayload: JSON.stringify(Object.fromEntries(signingKeys.entries())),
        salt: 'in-memory',
      });
    },
    importSigningKeys(
      exportData: SigningKeyExport,
      options?: ImportSigningKeysOptions,
    ): Promise<ImportSigningKeysResult> {
      const strategy = options?.conflictStrategy ?? 'error';
      const incoming = JSON.parse(exportData.encryptedPayload) as Record<ContractAddress, SigningKey>;
      let imported = 0;
      let skipped = 0;
      let overwritten = 0;
      for (const [address, key] of Object.entries(incoming) as [ContractAddress, SigningKey][]) {
        if (signingKeys.has(address)) {
          if (strategy === 'skip') {
            skipped++;
            continue;
          }
          if (strategy === 'error') {
            return Promise.reject(new Error(`Conflict importing signing key for "${address}"`));
          }
          overwritten++;
        } else {
          imported++;
        }
        signingKeys.set(address, key);
      }
      return Promise.resolve({ imported, skipped, overwritten });
    },
  };
}
