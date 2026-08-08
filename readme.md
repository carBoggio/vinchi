# midnight

Two independent npm projects:

- `front/` — React + Vite. Run with:
  ```
  cd front
  npm install
  npm run dev
  ```

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
