# midnight

## Requirements

- Node.js 22+
- Docker with Compose v2
- The Compact compiler — installed globally, not via npm: `curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh`, then `compact update` (see https://docs.midnight.network/getting-started/installation). Without this, `npm run compile` in `back/contracts/` fails with `compact: command not found`.

## Network + contract config

`/midnight/.env` (copy from `.env.example`) is the single source of truth for which network the project targets (`MIDNIGHT_NETWORK`) and where `VinchiNotes`/`MerchantRegistry` are deployed there (`VINCHI_NOTES_ADDRESS`, `MERCHANT_REGISTRY_ADDRESS`). Both `back/contracts/` and `front/` read it — see `back/contracts/src/network.ts` and `front/src/midnight/network.ts`. Switch networks by editing that one file; nothing else needs touching.

Two independent npm projects:

- `front/` — React + Vite. Run with:
  ```
  cd front
  npm install
  npm run dev
  ```
  Includes a deposit flow (`src/send_deposit.tsx`) that connects an injected Midnight wallet (e.g. Lace) via the DApp Connector API and submits a real `deposit` transaction to `VinchiNotes` — see `front/src/midnight/` for the network/wallet/provider wiring. Needs `VINCHI_NOTES_ADDRESS` set in the root `.env` and `back/contracts` compiled (`npm run compile:vinchi-notes`).

- `back/` — local Midnight devnet + contracts. The whole backend starts with a single `docker compose up` from `back/`:
  ```
  cd back
  docker compose up -d
  ```
  This brings up the Midnight node (`localhost:9944`), indexer (`localhost:8088`), and proof server (`localhost:6300`) on the `undeployed` network id.

  To stop the backend:
  ```
  cd back
  docker compose down
  ```

  Contracts live in `back/contracts/` (scaffolded with `create-mn-app`). With the network running:
  ```
  cd back/contracts
  npm install
  npm run compile   # compile contracts
  npm run deploy    # deploy to the local network
  ```

  Or run both compile and deploy in one command:
  ```
  npm run setup     # proof-server + compile + deploy
  ```

  (Check `back/contracts/package.json` for the exact script names if these have drifted.)
