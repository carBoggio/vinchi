#!/usr/bin/env node
// Copies VinchiNotes' compiled output from back/contracts/contracts/managed/
// into front/, in two different shapes for two different consumers:
//
//   - keys/ + zkir/  -> public/zk/VinchiNotes/   (fetched over HTTP at
//     runtime by FetchZkConfigProvider — must be static assets, browsers
//     can't read back/'s filesystem directly)
//   - contract/      -> src/midnight/generated/VinchiNotes/  (imported as a
//     normal ES module by depositContract.ts). This one specifically must
//     live *inside* front/'s own source tree: a dynamic import reaching
//     across to back/contracts/ resolves as a browser URL relative to the
//     importing module, which cannot climb above the dev server's root —
//     "../../../back/..." silently lands on a nonexistent front/back/ path
//     instead of escaping to the sibling project. Copying avoids that class
//     of bug entirely, in dev and in `vite build` alike.
//
// Plumbing only — no contract logic lives here. Safe to run before
// back/contracts has compiled anything: it skips with a warning instead of
// failing dev/build.
import { existsSync, cpSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTRACT_NAME = 'VinchiNotes';
const SRC = path.resolve(__dirname, '..', '..', 'back', 'contracts', 'contracts', 'managed', CONTRACT_NAME);

if (!existsSync(SRC)) {
  console.warn(
    `[sync:contract-assets] ${SRC} does not exist yet — run "npm run compile:vinchi-notes" in back/contracts/ first. ` +
      'Skipping copy; the deposit flow will fail until this has run at least once.',
  );
  process.exit(0);
}

function syncDir(srcDir, destDir) {
  if (!existsSync(srcDir)) return;
  rmSync(destDir, { recursive: true, force: true });
  cpSync(srcDir, destDir, { recursive: true });
}

const zkDest = path.resolve(__dirname, '..', 'public', 'zk', CONTRACT_NAME);
for (const dir of ['keys', 'zkir']) {
  syncDir(path.join(SRC, dir), path.join(zkDest, dir));
}

const contractDest = path.resolve(__dirname, '..', 'src', 'midnight', 'generated', CONTRACT_NAME);
syncDir(path.join(SRC, 'contract'), contractDest);

console.log(`[sync:contract-assets] Copied ${CONTRACT_NAME} keys/zkir to ${path.relative(process.cwd(), zkDest)}`);
console.log(`[sync:contract-assets] Copied ${CONTRACT_NAME} contract bindings to ${path.relative(process.cwd(), contractDest)}`);
