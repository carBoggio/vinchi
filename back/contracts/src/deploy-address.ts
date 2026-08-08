/**
 * Deploy VinchiNotes or MerchantRegistry and print the resulting contract
 * address to the console. That is the only output this script produces —
 * it does not write the address to any file. Copy it into the repo-root
 * .env by hand.
 *
 * Usage:
 *   npx tsx src/deploy-address.ts VinchiNotes
 *   npx tsx src/deploy-address.ts MerchantRegistry
 *
 * Target network comes from MIDNIGHT_NETWORK in the repo-root .env file
 * (../../../.env from this file — see loadRootEnv below), the same variable
 * network.ts's resolveNetwork() reads from process.env. Falls back to
 * .midnight-state.json's sticky active network, then "undeployed", exactly
 * like deploy.ts/cli.ts — this script adds no resolution logic of its own,
 * it just makes sure the root .env has been loaded into process.env first.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WebSocket } from 'ws';
import * as Rx from 'rxjs';

import { resolveNetwork, getOrCreateWallet, formatWalletBackupNotice, ENV_NETWORK_VAR } from './network';
import { createWallet, persistWalletState, unshieldedToken, type WalletContext } from './wallet';
import { computeGovernorKey, requireGovernorSecretKey } from './governor';

import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';

// @ts-expect-error Required for wallet sync
globalThis.WebSocket = WebSocket;

const CONTRACT_NAMES = ['VinchiNotes', 'MerchantRegistry'] as const;
type ContractName = (typeof CONTRACT_NAMES)[number];

// Both contracts take a single constructor argument: governorPk, the hash
// commitment of a governor secret key (governorKey(sk) — see governor.ts,
// which replicates that non-exported .compact circuit). GOVERNOR_SECRET_KEY
// in the repo-root .env is the real key; run generate-governor.ts once to
// create one. Earlier deployments used 32 zero bytes as a placeholder
// governorPk directly (not hashed) — since no secret key hashes to exactly
// zero, every governor-gated circuit (addMerchant, pokeIndex,
// syncMerchantRoot) was permanently unusable on those. governor is `sealed`
// in the .compact source (fixed forever at construction), so this only
// takes effect on contracts deployed *after* this change.

function throwingWitness(name: string) {
  return () => {
    throw new Error(`witness '${name}' is a deploy-only stub and should never be invoked by a constructor`);
  };
}

const WITNESSES_BY_CONTRACT: Record<ContractName, Record<string, (...args: unknown[]) => never>> = {
  VinchiNotes: {
    governorSecretKey: throwingWitness('governorSecretKey'),
    nullifierKeyFor: throwingWitness('nullifierKeyFor'),
    mulDivFloorWitness: throwingWitness('mulDivFloorWitness'),
  },
  MerchantRegistry: {
    governorSecretKey: throwingWitness('governorSecretKey'),
  },
};

/**
 * Loads the repo-root .env into process.env (Node's native loader — no
 * dotenv dependency). Values already present in process.env are left alone,
 * so a real shell export of MIDNIGHT_NETWORK still wins over the file.
 * No-op if the file doesn't exist: a root .env is optional.
 */
function loadRootEnv(): void {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  // src -> contracts -> back -> repo root
  const rootEnvPath = path.resolve(__dirname, '..', '..', '..', '.env');
  if (!fs.existsSync(rootEnvPath)) return;
  process.loadEnvFile(rootEnvPath);
}

async function waitForProofServer(proofServerUrl: string, maxAttempts = 60, delayMs = 2000): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await fetch(proofServerUrl, { method: 'GET', signal: AbortSignal.timeout(3000) });
      return true;
    } catch (err: any) {
      const code = err?.cause?.code || err?.code || '';
      if (code !== 'ECONNREFUSED' && code !== 'UND_ERR_CONNECT_TIMEOUT' && code !== 'UND_ERR_SOCKET') {
        return true;
      }
    }
    if (attempt < maxAttempts) {
      process.stdout.write(`\r  Waiting for proof server... (${attempt}/${maxAttempts})   `);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return false;
}

async function main() {
  const contractName = process.argv[2] as ContractName | undefined;
  if (!contractName || !CONTRACT_NAMES.includes(contractName)) {
    console.error(`Usage: npx tsx src/deploy-address.ts <${CONTRACT_NAMES.join('|')}>`);
    process.exit(1);
  }

  loadRootEnv();
  const governorSecretKey = requireGovernorSecretKey();
  const governorPk = computeGovernorKey(governorSecretKey);
  const { network, config: networkConfig, source } = resolveNetwork();
  console.log(`\n╔══ Deploying ${contractName} to ${network} ══╗\n`);
  if (source === 'env') {
    console.log(`  (network selected via ${ENV_NETWORK_VAR} in the repo-root .env)\n`);
  }

  const wallet = getOrCreateWallet(network);
  {
    const notice = formatWalletBackupNotice(wallet, network);
    if (notice) console.log(notice);
  }

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const zkConfigPath = path.resolve(__dirname, '..', 'contracts', 'managed', contractName);
  const contractPath = path.join(zkConfigPath, 'contract', 'index.js');
  if (!fs.existsSync(contractPath)) {
    console.error(`\n❌ ${contractName} not compiled. Run: npm run compile -- contracts/${contractName}.compact contracts/managed/${contractName}\n`);
    process.exit(1);
  }
  const mod = await import(pathToFileURL(contractPath).href);

  // mod.Contract comes from a dynamic import (typed `any`), which defeats the
  // effect-ts generic inference on CompiledContract.make/.pipe/withWitnesses —
  // same reason deploy.ts casts the finished contract to `any` at the
  // deployContract call. Casting the curried combinators themselves to `any`
  // sidesteps TS defaulting their unresolvable generics to `never`.
  const withWitnesses = CompiledContract.withWitnesses as any;
  const withCompiledFileAssets = CompiledContract.withCompiledFileAssets as any;
  const compiledContract = (CompiledContract.make(contractName, mod.Contract) as any).pipe(
    withWitnesses(WITNESSES_BY_CONTRACT[contractName]),
    withCompiledFileAssets(zkConfigPath),
  );

  console.log('  Creating wallet...');
  const walletCtx: WalletContext = await createWallet({ network, networkConfig, seed: wallet.seed });
  console.log('  Syncing with network (this can take a while on first run)...');
  await walletCtx.wallet.waitForSyncedState();
  await persistWalletState(network, walletCtx);

  const address = walletCtx.unshieldedKeystore.getBech32Address();
  const state = await walletCtx.wallet.waitForSyncedState();
  const balance = state.unshielded.balances[unshieldedToken().raw] ?? 0n;
  console.log(`  Wallet address: ${address}`);
  console.log(`  Balance: ${balance.toLocaleString()} tNight\n`);

  if (network === 'undeployed' && balance === 0n) {
    console.error('❌ Genesis-seed wallet has zero NIGHT. Is the local devnet up? (docker compose ps)\n');
    await walletCtx.wallet.stop();
    process.exit(1);
  }

  // DUST registration/wait — same idiom as deploy.ts.
  const dustState = await Rx.firstValueFrom(walletCtx.wallet.state().pipe(Rx.filter((s) => s.isSynced)));
  const unregisteredUtxos = dustState.unshielded.availableCoins.filter(
    (c: any) => !c.meta?.registeredForDustGeneration,
  );
  if (unregisteredUtxos.length > 0) {
    console.log('  Registering NIGHT UTXOs for DUST generation...');
    const recipe = await walletCtx.wallet.registerNightUtxosForDustGeneration(
      unregisteredUtxos,
      walletCtx.unshieldedKeystore.getPublicKey(),
      (payload) => walletCtx.unshieldedKeystore.signData(payload),
    );
    const finalized = await walletCtx.wallet.finalizeRecipe(recipe);
    await walletCtx.wallet.submitTransaction(finalized);
  }
  if (dustState.dust.balance(new Date()) === 0n) {
    console.log('  Waiting for DUST...');
    await Rx.firstValueFrom(
      walletCtx.wallet.state().pipe(
        Rx.throttleTime(5000),
        Rx.filter((s) => s.isSynced),
        Rx.filter((s) => s.dust.balance(new Date()) > 0n),
      ),
    );
  }

  console.log('  Checking proof server...');
  if (!(await waitForProofServer(networkConfig.proofServer))) {
    console.error('\n❌ Proof server not responding. Run: docker compose up -d\n');
    await walletCtx.wallet.stop();
    process.exit(1);
  }

  const privateStatePassword =
    process.env.PRIVATE_STATE_PASSWORD?.trim() || 'Local-Devnet-Development-Placeholder-1';
  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);
  const accountId = walletCtx.unshieldedKeystore.getBech32Address().toString();
  const walletProvider = {
    getCoinPublicKey: () => walletCtx.shieldedSecretKeys.coinPublicKey,
    getEncryptionPublicKey: () => walletCtx.shieldedSecretKeys.encryptionPublicKey,
    async balanceTx(tx: any, ttl?: Date) {
      const recipe = await walletCtx.wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: walletCtx.shieldedSecretKeys, dustSecretKey: walletCtx.dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      return walletCtx.wallet.finalizeRecipe(recipe);
    },
    submitTx: (tx: any) => walletCtx.wallet.submitTransaction(tx) as any,
  };
  const providers = {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: `${contractName}-state`,
      accountId,
      privateStoragePasswordProvider: () => privateStatePassword,
    }),
    publicDataProvider: indexerPublicDataProvider(networkConfig.indexer, networkConfig.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(networkConfig.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };

  console.log('  Generating DUST headroom...');
  await new Promise((r) => setTimeout(r, 6000));

  console.log(`  Deploying ${contractName}...\n`);
  const MAX_RETRIES = 20;
  const RETRY_DELAY_MS = 5000;
  let deployed: Awaited<ReturnType<typeof deployContract>> | undefined;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      deployed = await deployContract(providers, {
        compiledContract: compiledContract as any,
        args: [governorPk],
        privateStateId: `${contractName}PrivateState`,
        initialPrivateState: {},
      });
      break;
    } catch (err: any) {
      const errMsg = err?.message || err?.toString() || '';
      const errCause = err?.cause?.message || err?.cause?.toString() || '';
      const fullError = `${errMsg} ${errCause}`;
      const isDustShortage =
        fullError.includes('Not enough Dust') ||
        fullError.includes('Insufficient Funds') ||
        fullError.includes('could not balance dust');
      if (!(isDustShortage && attempt === 1)) console.error(`  Attempt ${attempt} error: ${errMsg}`);
      if (isDustShortage && attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      throw err;
    }
  }
  if (!deployed) throw new Error('Deployment failed after all retries');

  await persistWalletState(network, walletCtx);
  await walletCtx.wallet.stop();

  const contractAddress = deployed.deployTxData.public.contractAddress;
  console.log(`\n✅ ${contractName} deployed on ${network}\n`);
  console.log(`   ${contractAddress}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
