/**
 * Registers a merchant's owner-commitment in the already-deployed
 * MerchantRegistry contract, then syncs the resulting merchant-tree root
 * into the already-deployed VinchiNotes contract.
 *
 * Both steps are required: MerchantRegistry is a separate, independently
 * deployed contract (no cross-contract calls in this MVP), so `pay` — which
 * checks membership against VinchiNotes' own locally cached `merchantRoot`
 * ledger field — has no way to see a new merchant until the governor
 * explicitly calls VinchiNotes' `syncMerchantRoot` with the fresh root. See
 * MerchantRegistry.compact's `addMerchant` and VinchiNotes.compact's
 * `syncMerchantRoot` for the corresponding circuits.
 *
 * Usage:
 *   npx tsx src/register-merchant.ts <merchantOwnerCommitmentHex>
 *
 * merchantOwnerCommitmentHex is a 64-hex-char (32-byte) string — typically
 * ownerCommitment(nullifierKey) for whoever should be payable as this
 * merchant (see generate-recipient.ts). For a self-pay test, pass your own
 * recipientOwner value.
 *
 * Target network comes from MIDNIGHT_NETWORK in the repo-root .env (see
 * loadRootEnv below), same as deploy-address.ts. Contract addresses come
 * from VINCHI_NOTES_ADDRESS / MERCHANT_REGISTRY_ADDRESS in that same .env —
 * this deployment's addresses are not recorded in .midnight-state.json.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WebSocket } from 'ws';
import * as Rx from 'rxjs';

import { resolveNetwork, getOrCreateWallet, formatWalletBackupNotice, ENV_NETWORK_VAR } from './network';
import { createWallet, persistWalletState, unshieldedToken, type WalletContext } from './wallet';
import { requireGovernorSecretKey } from './governor';

import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';

// @ts-expect-error Required for wallet sync
globalThis.WebSocket = WebSocket;

function throwingWitness(name: string) {
  return () => {
    throw new Error(`witness '${name}' is not invoked by the circuits this script calls`);
  };
}

const SEED_HEX_RE = /^[0-9a-fA-F]{64}$/;

/**
 * Loads the repo-root .env into process.env (Node's native loader — no
 * dotenv dependency). Values already present in process.env are left alone.
 * No-op if the file doesn't exist: a root .env is optional.
 */
function loadRootEnv(): void {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  // src -> contracts -> back -> repo root
  const rootEnvPath = path.resolve(__dirname, '..', '..', '..', '.env');
  if (!fs.existsSync(rootEnvPath)) return;
  process.loadEnvFile(rootEnvPath);
}

function parseMerchantOwnerCommitment(raw: string | undefined): Uint8Array {
  if (!raw) {
    console.error('Usage: npx tsx src/register-merchant.ts <merchantOwnerCommitmentHex>');
    process.exit(1);
  }
  const clean = raw.startsWith('0x') || raw.startsWith('0X') ? raw.slice(2) : raw;
  if (!SEED_HEX_RE.test(clean)) {
    console.error(
      `\n❌ merchantOwnerCommitmentHex must be 32 bytes (64 hex characters), got "${raw}"\n`,
    );
    process.exit(1);
  }
  return Buffer.from(clean, 'hex');
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
  loadRootEnv();

  const merchantOwnerCommitment = parseMerchantOwnerCommitment(process.argv[2]);
  const merchantOwnerCommitmentHex = Buffer.from(merchantOwnerCommitment).toString('hex');

  const merchantRegistryAddress = process.env.MERCHANT_REGISTRY_ADDRESS?.trim();
  const vinchiNotesAddress = process.env.VINCHI_NOTES_ADDRESS?.trim();
  if (!merchantRegistryAddress) {
    console.error(
      '\n❌ MERCHANT_REGISTRY_ADDRESS is not set in the repo-root .env. Deploy it first ' +
        '(back/contracts: npx tsx src/deploy-address.ts MerchantRegistry) and copy the printed address into .env.\n',
    );
    process.exit(1);
  }
  if (!vinchiNotesAddress) {
    console.error(
      '\n❌ VINCHI_NOTES_ADDRESS is not set in the repo-root .env. Deploy it first ' +
        '(back/contracts: npx tsx src/deploy-address.ts VinchiNotes) and copy the printed address into .env.\n',
    );
    process.exit(1);
  }

  const governorSk = requireGovernorSecretKey();
  const governorSecretKeyWitness = (context: { privateState: unknown }) => [context.privateState, governorSk];

  const { network, config: networkConfig, source } = resolveNetwork();
  console.log(`\n╔══ Registering merchant on ${network} ══╗\n`);
  if (source === 'env') {
    console.log(`  (network selected via ${ENV_NETWORK_VAR} in the repo-root .env)\n`);
  }
  console.log(`  Merchant owner commitment: ${merchantOwnerCommitmentHex}`);
  console.log(`  MerchantRegistry: ${merchantRegistryAddress}`);
  console.log(`  VinchiNotes:      ${vinchiNotesAddress}\n`);

  const wallet = getOrCreateWallet(network);
  {
    const notice = formatWalletBackupNotice(wallet, network);
    if (notice) console.log(notice);
  }

  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  const merchantRegistryZkConfigPath = path.resolve(__dirname, '..', 'contracts', 'managed', 'MerchantRegistry');
  const merchantRegistryContractPath = path.join(merchantRegistryZkConfigPath, 'contract', 'index.js');
  if (!fs.existsSync(merchantRegistryContractPath)) {
    console.error(
      '\n❌ MerchantRegistry not compiled. Run: npm run compile:merchant-registry\n',
    );
    process.exit(1);
  }

  const vinchiNotesZkConfigPath = path.resolve(__dirname, '..', 'contracts', 'managed', 'VinchiNotes');
  const vinchiNotesContractPath = path.join(vinchiNotesZkConfigPath, 'contract', 'index.js');
  if (!fs.existsSync(vinchiNotesContractPath)) {
    console.error('\n❌ VinchiNotes not compiled. Run: npm run compile:vinchi-notes\n');
    process.exit(1);
  }

  const MerchantRegistry = await import(pathToFileURL(merchantRegistryContractPath).href);
  const VinchiNotes = await import(pathToFileURL(vinchiNotesContractPath).href);

  // mod.Contract comes from a dynamic import (typed `any`), which defeats the
  // effect-ts generic inference on CompiledContract.make/.pipe/withWitnesses —
  // same reason deploy-address.ts casts the curried combinators to `any`.
  const withWitnesses = CompiledContract.withWitnesses as any;
  const withCompiledFileAssets = CompiledContract.withCompiledFileAssets as any;

  const merchantRegistryCompiledContract = (
    CompiledContract.make('MerchantRegistry', MerchantRegistry.Contract) as any
  ).pipe(
    withWitnesses({ governorSecretKey: governorSecretKeyWitness }),
    withCompiledFileAssets(merchantRegistryZkConfigPath),
  );

  const vinchiNotesCompiledContract = (CompiledContract.make('VinchiNotes', VinchiNotes.Contract) as any).pipe(
    withWitnesses({
      governorSecretKey: governorSecretKeyWitness,
      nullifierKeyFor: throwingWitness('nullifierKeyFor'),
      mulDivFloorWitness: throwingWitness('mulDivFloorWitness'),
    }),
    withCompiledFileAssets(vinchiNotesZkConfigPath),
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

  // DUST registration/wait — same idiom as deploy-address.ts.
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

  function makeProviders(contractName: string, zkConfigPath: string) {
    const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);
    return {
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
  }

  const merchantRegistryProviders = makeProviders('MerchantRegistry', merchantRegistryZkConfigPath);
  const vinchiNotesProviders = makeProviders('VinchiNotes', vinchiNotesZkConfigPath);

  console.log('  Generating DUST headroom...');
  await new Promise((r) => setTimeout(r, 6000));

  console.log('  Connecting to MerchantRegistry...');
  const merchantRegistryDeployed: any = await findDeployedContract(merchantRegistryProviders, {
    compiledContract: merchantRegistryCompiledContract as any,
    contractAddress: merchantRegistryAddress,
    privateStateId: 'merchantRegistryPrivateState',
    initialPrivateState: {},
  });

  console.log(`  Calling addMerchant(${merchantOwnerCommitmentHex})...\n`);
  const addMerchantTx = await merchantRegistryDeployed.callTx.addMerchant(merchantOwnerCommitment);
  console.log(`  ✅ addMerchant submitted. Tx id: ${addMerchantTx.public.txId}\n`);

  console.log('  Reading MerchantRegistry ledger state for the fresh merchants root...');
  const merchantRegistryContractState = await merchantRegistryProviders.publicDataProvider.queryContractState(
    merchantRegistryAddress,
  );
  if (!merchantRegistryContractState) {
    throw new Error(`MerchantRegistry contract state not found at ${merchantRegistryAddress} after addMerchant`);
  }
  const merchantRegistryLedger = MerchantRegistry.ledger(merchantRegistryContractState.data);
  const newRoot = merchantRegistryLedger.merchants.root();
  console.log(`  New merchants root: ${newRoot.field}\n`);

  console.log('  Connecting to VinchiNotes...');
  const vinchiNotesDeployed: any = await findDeployedContract(vinchiNotesProviders, {
    compiledContract: vinchiNotesCompiledContract as any,
    contractAddress: vinchiNotesAddress,
    privateStateId: 'vinchiNotesPrivateState',
    initialPrivateState: {},
  });

  console.log('  Calling syncMerchantRoot(newRoot)...\n');
  const syncTx = await vinchiNotesDeployed.callTx.syncMerchantRoot(newRoot);
  console.log(`  ✅ syncMerchantRoot submitted. Tx id: ${syncTx.public.txId}\n`);

  await persistWalletState(network, walletCtx);
  await walletCtx.wallet.stop();

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║ Merchant registered and VinchiNotes merchantRoot synced.      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`  Merchant owner commitment: ${merchantOwnerCommitmentHex}`);
  console.log(`  addMerchant tx:            ${addMerchantTx.public.txId}`);
  console.log(`  syncMerchantRoot tx:       ${syncTx.public.txId}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
