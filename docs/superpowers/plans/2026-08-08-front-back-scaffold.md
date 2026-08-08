# Front/Back Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the empty `/home/car/projects/midnight` repo into an independent `front/` (React + Vite, `npm run dev`) and `back/` (local Midnight devnet via a single `docker compose up`, plus a `contracts/` folder with a working compile → deploy pipeline).

**Architecture:** Two standalone npm projects, no shared workspace. `front/` is a Vite-scaffolded React+TS app with a minimal Lace wallet connector. `back/docker-compose.yml` runs the three-container Midnight local network (`node`, `indexer`, `proof-server`, network id `undeployed`). `back/contracts/` is generated with the official `create-mn-app` CLI (hello-world template) so the wallet/provider/deploy wiring comes from a maintained tool instead of hand-assembled code, then reorganized so its `docker-compose.yml` lives at `back/` instead of nested inside `contracts/`.

**Tech Stack:** React 19 + Vite + TypeScript, `@midnight-ntwrk/dapp-connector-api`, Docker Compose v2, Compact toolchain, `create-mn-app`, Node.js 22+, npm.

## Global Constraints

- Package manager is npm everywhere (`front/`, `back/contracts/`) — no yarn/pnpm/bun, per explicit user requirement.
- `front/` and `back/contracts/` are independent npm projects — no root `package.json`, no npm workspaces.
- `back/` must start completely with a single `docker compose up` run from inside `back/` (compose file lives at `back/docker-compose.yml`, not nested).
- `front/` must start completely with `npm run dev` run from inside `front/`.
- No backend application/API server — only the Midnight local network + contracts.
- No git operations beyond plain commits to the already-initialized local repo (no push, no force operations) — see [[repo-init]] context: repo was freshly `git init`'d this session, default branch `master`.
- Every task ends with a commit to git (repo already initialized at `/home/car/projects/midnight`).

---

### Task 1: Scaffold `front/` with Vite + React + TypeScript

**Files:**
- Create: `front/` (entire Vite scaffold: `package.json`, `vite.config.ts`, `index.html`, `tsconfig*.json`, `src/main.tsx`, `src/App.tsx`, `src/App.css`, `src/index.css`, `.gitignore`, `public/`)

**Interfaces:**
- Produces: a working npm project at `front/` with `npm run dev` (starts Vite dev server, default port 5173) and `npm run build` (type-checks + builds to `front/dist/`).

- [ ] **Step 1: Scaffold the project**

Run from `/home/car/projects/midnight`:

```bash
npm create vite@latest front -- --template react-ts
```

This creates `front/` non-interactively with the `react-ts` template (no prompts needed since `front` and the template are passed as arguments).

- [ ] **Step 2: Install dependencies**

```bash
cd /home/car/projects/midnight/front && npm install
```

- [ ] **Step 3: Verify the scaffold builds**

```bash
cd /home/car/projects/midnight/front && npm run build
```

Expected: exits 0, prints a Vite build summary, creates `front/dist/`.

- [ ] **Step 4: Verify the dev server serves**

```bash
cd /home/car/projects/midnight/front && npm run dev -- --port 5173 &
sleep 3
curl -sf http://localhost:5173/ | grep -qi '<div id="root">' && echo DEV_SERVER_OK
kill %1
```

Expected: prints `DEV_SERVER_OK`.

- [ ] **Step 5: Commit**

```bash
cd /home/car/projects/midnight
git add front/
git commit -m "$(cat <<'EOF'
Scaffold front/ with Vite + React + TypeScript

Standalone npm project (npm run dev), no shared workspace with back/.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Add Midnight wallet connector to `front/`

**Files:**
- Modify: `front/package.json` (add `@midnight-ntwrk/dapp-connector-api` dependency)
- Create: `front/src/selectWallet.ts`
- Modify: `front/src/App.tsx` (replace Vite default counter demo with a wallet-connect UI)
- Create: `front/.env.example`

**Interfaces:**
- Consumes: `front/` project from Task 1.
- Produces: `selectWallet()` and `listWallets()` exported from `front/src/selectWallet.ts`, used by `App.tsx`. `front/.env.example` documents `VITE_INDEXER_URL`, `VITE_INDEXER_WS_URL`, `VITE_NODE_URL`, `VITE_PROOF_SERVER_URL`, `VITE_NETWORK_ID` for later use once a contract is deployed.

- [ ] **Step 1: Install the DApp Connector API package**

```bash
cd /home/car/projects/midnight/front && npm install @midnight-ntwrk/dapp-connector-api
```

- [ ] **Step 2: Write the wallet selector**

Create `front/src/selectWallet.ts`:

```typescript
import type { InitialAPI } from '@midnight-ntwrk/dapp-connector-api';

export const listWallets = (): InitialAPI[] => {
  const injected = window.midnight;
  return injected ? Object.values(injected) : [];
};

export const selectWallet = (): InitialAPI => {
  const wallets = listWallets();

  if (wallets.length === 0) {
    throw new Error('No Midnight wallet found. Please install a Midnight wallet extension.');
  }

  return wallets[0];
};
```

- [ ] **Step 3: Replace the default App with a wallet-connect UI**

Overwrite `front/src/App.tsx`:

```tsx
import { useState } from 'react';
import './App.css';
import { selectWallet } from './selectWallet';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setError(null);
    try {
      const wallet = selectWallet();
      const connectedApi = await wallet.connect('undeployed');
      const { unshieldedAddress } = await connectedApi.getUnshieldedAddress();
      setWalletAddress(unshieldedAddress);
      setIsConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setIsConnected(false);
      setWalletAddress(null);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setWalletAddress(null);
  };

  return (
    <div>
      <h1>Midnight Wallet Connector</h1>
      <div>
        {isConnected && walletAddress ? (
          <>
            <p>Connected: {walletAddress}</p>
            <button onClick={handleDisconnect}>Disconnect</button>
          </>
        ) : (
          <button onClick={handleConnect}>Connect Wallet</button>
        )}
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default App;
```

- [ ] **Step 4: Document local network endpoints**

Create `front/.env.example`:

```
VITE_INDEXER_URL=http://localhost:8088/api/v4/graphql
VITE_INDEXER_WS_URL=ws://localhost:8088/api/v4/graphql/ws
VITE_NODE_URL=http://localhost:9944
VITE_PROOF_SERVER_URL=http://localhost:6300
VITE_NETWORK_ID=undeployed
```

- [ ] **Step 5: Verify build still passes**

```bash
cd /home/car/projects/midnight/front && npm run build
```

Expected: exits 0 (no TypeScript errors from the new `App.tsx`/`selectWallet.ts`).

- [ ] **Step 6: Verify the dev server serves the new UI**

```bash
cd /home/car/projects/midnight/front && npm run dev -- --port 5173 &
sleep 3
curl -sf http://localhost:5173/ | grep -qi '<div id="root">' && echo DEV_SERVER_OK
kill %1
```

Expected: prints `DEV_SERVER_OK`. (The "Connect Wallet" button itself can only be exercised in a real browser with a Lace extension — out of scope to automate here; this step only confirms the app still serves without a build/runtime crash.)

- [ ] **Step 7: Commit**

```bash
cd /home/car/projects/midnight
git add front/
git commit -m "$(cat <<'EOF'
Add minimal Lace wallet connector to front/

Follows Midnight's official DApp Connector API pattern (selectWallet
reads window.midnight, connects with connect('undeployed')). No
contract calls yet — back/ has no application API in this phase.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Scaffold `back/contracts/` with `create-mn-app` and verify the local devnet + deploy pipeline

**Files:**
- Create: `back/contracts/` (entire `create-mn-app` output: `package.json`, `contracts/hello-world.compact`, `src/deploy.ts`, `src/cli.ts`, `src/check-balance.ts`, and its own generated `docker-compose.yml`)
- Move: `back/contracts/docker-compose.yml` → `back/docker-compose.yml`
- Modify: `back/contracts/package.json` (only if a script hardcodes a path to the now-moved `docker-compose.yml`)

**Interfaces:**
- Produces: `back/docker-compose.yml` (three services: node, indexer, proof-server, network id `undeployed`, ports `9944`/`8088`/`6300`). `back/contracts/` with a working compile script and a working deploy script that, run against the local network, prints a deployed contract address.

- [ ] **Step 1: Check prerequisites**

```bash
node --version   # expect v22.x or higher
docker --version
docker compose version   # expect v2.x
```

If `node --version` is below 22, stop and report — the Midnight toolchain requires Node 22+ (do not attempt to work around this by downgrading dependencies).

- [ ] **Step 2: Inspect available `create-mn-app` flags**

```bash
npx create-mn-app@latest --help
```

Confirm the flags used in the next step still exist (`-t/--template`, `--network`, `-y`, `--use-npm`, `--skip-git`). If a flag has been renamed or removed, adjust the Step 3 command to match the current CLI and note the discrepancy in the commit message.

- [ ] **Step 3: Scaffold the contract project**

```bash
mkdir -p /home/car/projects/midnight/back
cd /home/car/projects/midnight/back
npx create-mn-app@latest contracts --template hello-world --network undeployed -y --use-npm --skip-git
```

Expected: creates `back/contracts/` populated with a `package.json`, a `contracts/hello-world.compact` file, a `src/` directory with `deploy.ts` (and likely `cli.ts`, `check-balance.ts`), and its own `docker-compose.yml`, with dependencies already installed (unless `--skip-install` was implied by a prompt — if dependencies were not installed, run `cd back/contracts && npm install`).

- [ ] **Step 4: Inspect the generated structure**

```bash
cd /home/car/projects/midnight/back/contracts
ls -la
cat package.json
```

Note the exact npm script names for compiling the contract and for deploying it (look for scripts whose command references `compact compile`, and scripts that run `deploy.ts` e.g. via `tsx`). These names are used in Steps 7–8 below — substitute the actual names found here.

- [ ] **Step 5: Move the generated compose file up to `back/`**

```bash
cd /home/car/projects/midnight/back
mv contracts/docker-compose.yml docker-compose.yml
```

- [ ] **Step 6: Fix any script that assumed `docker-compose.yml` was alongside it**

Search for scripts in `back/contracts/package.json` that invoke `docker compose` (grep for `docker compose` or `docker-compose` in the `scripts` block). If found, update that script to point one level up, e.g. change:

```json
"docker compose up -d"
```

to:

```json
"docker compose -f ../docker-compose.yml up -d"
```

If no such script exists (the generated project only documents running `docker compose up` manually from its own directory in a README), skip this step — the important thing verified in Step 7 is that `docker compose` run from `back/` (not `back/contracts/`) brings the network up.

- [ ] **Step 7: Start the local network and verify it's healthy**

```bash
cd /home/car/projects/midnight/back
docker compose config   # validate the compose file parses
docker compose up -d
sleep 20
docker compose ps
```

Expected: `docker compose config` exits 0. `docker compose ps` shows all three services (node, indexer, proof-server) with state `running`/`healthy`. If the indexer shows a restart due to connecting before the node produced its first block, wait and re-run `docker compose ps` — this is expected transient behavior on a fresh chain, not a failure (per Midnight's own docs).

- [ ] **Step 8: Compile the contract**

```bash
cd /home/car/projects/midnight/back/contracts
npm run <compact-script-name-from-step-4>
```

Expected: exits 0, prints something like `Compiling 1 circuits: circuit "storeMessage" (k=6, rows=26)`, and creates a `managed/` (or similarly named) output directory under `contracts/`.

- [ ] **Step 9: Deploy the contract against the local network**

```bash
cd /home/car/projects/midnight/back/contracts
npm run <deploy-script-name-from-step-4>
```

Expected: exits 0, log output includes a line like `Contract deployed at: <hex address>`. This confirms the full pipeline (wallet build → sync → provider wiring → compile artifacts → proof generation → deploy transaction → indexer confirmation) works end-to-end against the `docker compose up` network from Task 3.

If the deploy script requires an explicit network flag or env var (check the script's source if it fails immediately with a config error), rerun with `MIDNIGHT_NETWORK=undeployed npm run <deploy-script-name>` or whatever env var the generated `src/config.ts`/equivalent expects — inspect that file if the default invocation doesn't already default to local.

- [ ] **Step 10: Stop the network**

```bash
cd /home/car/projects/midnight/back
docker compose down
```

Expected: exits 0, containers removed.

- [ ] **Step 11: Commit**

```bash
cd /home/car/projects/midnight
git add back/
git commit -m "$(cat <<'EOF'
Scaffold back/ with local Midnight devnet and contracts/

docker-compose.yml (node + indexer + proof-server, network id
'undeployed') lives at back/ so `docker compose up` from back/ starts
the whole backend. back/contracts/ generated via the official
create-mn-app CLI (hello-world template) so wallet/provider/deploy
wiring comes from a maintained tool. Verified end-to-end: compose up,
compile, deploy against the local network, compose down.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Root README tying both halves together

**Files:**
- Modify: `readme.md` (currently empty, at repo root)

**Interfaces:**
- Consumes: run commands established in Tasks 1–3.

- [ ] **Step 1: Write the root README**

Replace the contents of `/home/car/projects/midnight/readme.md`:

```markdown
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

  Contracts live in `back/contracts/` (scaffolded with `create-mn-app`). With the network running:
  ```
  cd back/contracts
  npm install
  npm run compact   # compile
  npm run deploy    # deploy to the local network
  ```
  (Check `back/contracts/package.json` for the exact script names if these have drifted.)
```

- [ ] **Step 2: Commit**

```bash
cd /home/car/projects/midnight
git add readme.md
git commit -m "$(cat <<'EOF'
Document how to run front/ and back/

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
