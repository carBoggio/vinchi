import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import { viteCommonjs } from '@originjs/vite-plugin-commonjs'

// https://vite.dev/config/
export default defineConfig({
  // Pinned to Vite 7 (not 8) specifically so these two plugins work: they
  // `require('rollup')` internally, which Vite 8's rolldown engine no longer
  // ships. Without them, ledger-v8's wasm-bindgen glue fails at runtime with
  // "Cannot access '__wbindgen_start' before initialization" and the whole
  // app fails to mount — confirmed by hand, not a preemptive guess. Matches
  // the exact vite/@vitejs-plugin-react/plugin versions Midnight's own
  // leaderboard-ui browser-dapp tutorial pins for the same reason.
  plugins: [react(), wasm(), topLevelAwait(), viteCommonjs()],
  // Vite's default downlevel target (chrome87/safari14/etc.) makes esbuild
  // choke trying to transform destructuring inside the huge ledger-v8 WASM
  // glue bundle (`vite build` fails inside vite-plugin-top-level-await's own
  // transform pass). `esnext` skips that downleveling — reasonable here: this
  // needs a WASM- and Lace-extension-capable browser anyway, legacy targets
  // were never in scope.
  build: { target: 'esnext' },
  // Repo-root .env (shared with back/contracts) is the single source of
  // truth for network + contract address config. See /midnight/.env.
  envDir: path.resolve(import.meta.dirname, '..'),
  // Vite only exposes VITE_-prefixed vars to client code by default. The
  // three extra entries below are exact variable names (not prefixes in the
  // "any MIDNIGHT_* var" sense) — startsWith-matching a full name only
  // matches that name, so MIDNIGHT_WALLET_SEED and friends in the same file
  // stay server/CLI-only and never reach the browser bundle.
  envPrefix: ['VITE_', 'MIDNIGHT_NETWORK', 'VINCHI_NOTES_ADDRESS', 'MERCHANT_REGISTRY_ADDRESS'],
  server: {
    fs: {
      // Needed to import the compiled contract straight out of
      // back/contracts/contracts/managed/VinchiNotes/contract — see
      // src/midnight/depositContract.ts.
      allow: ['..'],
    },
  },
})
