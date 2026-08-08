// Browser wallet bridge: finds an injected Midnight wallet (e.g. Lace) and
// connects it to the network selected in /midnight/.env. This is the DApp
// Connector API — the CLI seed-wallet in back/contracts/src/wallet.ts is a
// separate, Node-only path and has nothing to do with what runs here.
import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import { listWallets } from '../selectWallet';
import type { NetworkId } from './network';

// The API version this dapp was written against (matches the
// @midnight-ntwrk/dapp-connector-api dependency in package.json). Only the
// major version has to match — the DApp Connector API is additive within a
// major version.
const COMPATIBLE_MAJOR_VERSION = 4;

function isCompatibleWallet(wallet: InitialAPI): boolean {
  const major = Number.parseInt(wallet.apiVersion.split('.')[0] ?? '', 10);
  return major === COMPATIBLE_MAJOR_VERSION;
}

function findCompatibleWallet(): InitialAPI | undefined {
  return listWallets().find(isCompatibleWallet);
}

export interface ConnectWalletOptions {
  /** Total time to wait for a compatible wallet extension to appear. Default 3s. */
  discoveryTimeoutMs?: number;
  /** Total time to wait for the wallet's connect() call to resolve. Default 5s. */
  connectTimeoutMs?: number;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      },
    );
  });
}

async function waitForCompatibleWallet(timeoutMs: number): Promise<InitialAPI> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const wallet = findCompatibleWallet();
    if (wallet) return wallet;
    if (Date.now() >= deadline) {
      throw new Error(
        'No compatible Midnight wallet found. Install a Midnight wallet extension (e.g. Lace) and reload.',
      );
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}

/**
 * Connects to an injected Midnight wallet on the given network. Polls for
 * the wallet's injection (extensions can load after the page) and enforces
 * timeouts on both discovery and the connect() handshake, per the official
 * browser-dapp pattern.
 */
export async function connectWallet(
  networkId: NetworkId,
  options: ConnectWalletOptions = {},
): Promise<ConnectedAPI> {
  const { discoveryTimeoutMs = 3_000, connectTimeoutMs = 5_000 } = options;

  const wallet = await waitForCompatibleWallet(discoveryTimeoutMs);

  return withTimeout(
    wallet.connect(networkId),
    connectTimeoutMs,
    `Wallet "${wallet.name}" did not respond to connect() in time.`,
  );
}
