/**
 * Registers NIGHT for DUST generation for an ARBITRARY wallet — e.g. the
 * Lace wallet a browser dapp connects with — not just the CLI's own
 * genesis/mnemonic-managed wallet. Needed because Lace's in-extension
 * "Generate DUST" flow is built around Preprod's public Dust Generation
 * DApp and doesn't work against the local `undeployed` network (it just
 * hangs). This does the same on-chain registration deploy.ts already does
 * for its own wallet, but for whatever mnemonic you give it.
 *
 * Usage:
 *   MIDNIGHT_WALLET_MNEMONIC="<24 words from Lace>" npx tsx src/register-dust.ts
 *
 * Paste the exact recovery phrase Lace shows for that wallet (wallet
 * settings > reveal recovery phrase). Same mnemonic -> same keys, so this
 * transacts AS that wallet, not a separate one — the DUST shows up in Lace
 * once it resyncs.
 *
 * Explicitly re-fetches and passes its own DUST address as
 * registerNightUtxosForDustGeneration's 4th argument (dustReceiverAddress),
 * the same way example-bboard's generateDust() does via
 * `walletFacade.dust.waitForSyncedState().address`, rather than relying on
 * the default (register-to-self) behavior implicitly. Verified via
 * scripts/diagnose-dust-key.ts that this resolves to the exact same address
 * either way for this SDK version — so this is a confirmation, not expected
 * to change behavior — but it costs nothing to be explicit about it.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';
import * as Rx from 'rxjs';
import { resolveNetwork, isValidMnemonic, mnemonicToSeedHex, normalizeMnemonic } from './network';
import { createWallet, persistWalletState, unshieldedToken } from './wallet';

// @ts-expect-error Required for wallet sync
globalThis.WebSocket = WebSocket;

/**
 * Loads the repo-root .env into process.env (Node's native loader — no
 * dotenv dependency). Values already present in process.env are left alone,
 * so a real shell export still wins over the file. No-op if the file doesn't
 * exist. Mirrors deploy-address.ts's loadRootEnv() exactly.
 */
function loadRootEnv(): void {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  // src -> contracts -> back -> repo root
  const rootEnvPath = path.resolve(__dirname, '..', '..', '..', '.env');
  if (!fs.existsSync(rootEnvPath)) return;
  process.loadEnvFile(rootEnvPath);
}
loadRootEnv();

const { network, config: networkConfig } = resolveNetwork();

const rawMnemonic = process.env.MIDNIGHT_WALLET_MNEMONIC;
if (!rawMnemonic) {
  console.error(
    '\n❌ Set MIDNIGHT_WALLET_MNEMONIC to the 24-word recovery phrase of the wallet to register ' +
      '(e.g. exported from Lace: wallet settings > reveal recovery phrase).\n',
  );
  process.exit(1);
}
if (!isValidMnemonic(rawMnemonic)) {
  console.error('\n❌ MIDNIGHT_WALLET_MNEMONIC is not a valid BIP-39 recovery phrase (check the words and count).\n');
  process.exit(1);
}
const mnemonic = normalizeMnemonic(rawMnemonic);
const seed = mnemonicToSeedHex(mnemonic);

async function main() {
  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║  Register DUST on ${network}`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log('  Connecting wallet...');
  const walletCtx = await createWallet({ network, networkConfig, seed });

  console.log('  Syncing with network (this can take a bit)...');
  const state = await walletCtx.wallet.waitForSyncedState();
  await persistWalletState(network, walletCtx);

  const address = walletCtx.unshieldedKeystore.getBech32Address();
  const balance = state.unshielded.balances[unshieldedToken().raw] ?? 0n;
  console.log(`\n  Wallet address: ${address}`);
  console.log(`  NIGHT balance:  ${balance.toLocaleString()}\n`);

  if (balance === 0n) {
    console.error('❌ This wallet has 0 NIGHT — fund it first (local network faucet / airdrop), then retry.\n');
    await walletCtx.wallet.stop();
    process.exit(1);
  }

  const dustState = await Rx.firstValueFrom(walletCtx.wallet.state().pipe(Rx.filter((s) => s.isSynced)));

  // Explicit dustReceiverAddress, fetched the same way example-bboard's
  // generateDust does (`walletFacade.dust.waitForSyncedState().address`) —
  // the wallet's own dust sub-facade re-reporting its own address, rather
  // than trusting the default self-registration path implicitly. Already
  // proven (via scripts/diagnose-dust-key.ts) to equal Lace's own DUST
  // address exactly, so this is expected to be a no-op confirmation, not a
  // behavior change — running it anyway since that's the literal ask.
  const dustSyncedState = await walletCtx.wallet.dust.waitForSyncedState();
  const dustReceiver = dustSyncedState.address;
  console.log(`  Dust facade's own address: ${dustReceiver}`);

  const toRegister = dustState.unshielded.availableCoins.filter(
    (c: any) => !c.meta?.registeredForDustGeneration,
  );

  if (toRegister.length > 0) {
    console.log(`  Registering ${toRegister.length} NIGHT UTXO(s) for DUST generation...`);
    // signDustRegistration produces a recipe with N signatures matching N
    // inputs already — do NOT call signRecipe again (double-signs, chain
    // rejects with InputsSignaturesLengthMismatch). Same idiom as deploy.ts.
    const recipe = await walletCtx.wallet.registerNightUtxosForDustGeneration(
      toRegister,
      walletCtx.unshieldedKeystore.getPublicKey(),
      (payload) => walletCtx.unshieldedKeystore.signData(payload),
      dustReceiver,
    );
    const finalized = await walletCtx.wallet.finalizeRecipe(recipe);
    await walletCtx.wallet.submitTransaction(finalized);
  } else {
    console.log('  All NIGHT already registered for DUST generation.');
  }

  // dust.balance(now) is a *projection* of what registered NIGHT will
  // eventually generate — it can already read non-zero while zero actual
  // DUST UTXOs exist to spend, because a UTXO is only minted once the chain
  // processes a block that accounts for the accrual. Waiting on `balance() >
  // 0` (what this used to do) can report "ready" a block early, which is
  // exactly the shape of "Insufficient Funds: could not balance dust" a
  // wallet hits when it tries to spend before that UTXO exists. Wait on
  // availableCoins instead — the actual spendability signal.
  if ((dustState.dust.availableCoins?.length ?? 0) === 0) {
    console.log('  Waiting for a spendable DUST coin (balance projecting > 0 isn\'t enough)...');
    await Rx.firstValueFrom(
      walletCtx.wallet.state().pipe(
        Rx.throttleTime(5000),
        Rx.filter((s) => s.isSynced),
        Rx.tap((s) => {
          const bal = s.dust.balance(new Date());
          const coins = s.dust.availableCoins?.length ?? 0;
          console.log(`  ...DUST balance: ${bal.toLocaleString()}, spendable coins: ${coins}`);
        }),
        Rx.filter((s) => (s.dust.availableCoins?.length ?? 0) >= 1),
      ),
    );
  }

  const finalState = await walletCtx.wallet.waitForSyncedState();
  console.log(
    `\n✅ DUST ready. Balance: ${finalState.dust.balance(new Date()).toLocaleString()}, ` +
      `spendable coins: ${finalState.dust.availableCoins?.length ?? 0}\n`,
  );

  await persistWalletState(network, walletCtx);
  await walletCtx.wallet.stop();
}

main().catch((err) => {
  console.error('\n❌ Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
