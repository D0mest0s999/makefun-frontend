// Hand-in program for the makefun-frontend-01 entry (Node 22, standard library only).
//
// The entry itself is the static frontend in app/ beside this file: plain files, no build
// step, reading make.fun's public API from the browser. This program copies app/ and
// screenshots/ into the output directory and writes dossier.json there with buildDossier
// from the vendored library, exactly as the gate expects: the scorer rebuilds the dossier
// with its own copy of vendor/makefun-frontend.ts and compares the two byte for byte, so
// that file is never edited.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the app locally with `node serve.ts` (app/ on http://localhost:8080).

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The gate's own caps, passed to the library so an oversized hand-in fails here first:
// the dossier text is capped at 160 KiB, screenshots at 3 files of 256 KiB, app/ at 993
// files and directories and 16 MiB in all.
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 3, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
});
writeFileSync(join(out, 'dossier.json'), dossier);

const countFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).reduce(
    (n, e) => n + (e.isDirectory() ? countFiles(join(dir, e.name)) : 1),
    0,
  );
const shots = existsSync(join(out, 'screenshots')) ? readdirSync(join(out, 'screenshots')).length : 0;
const appFiles = countFiles(join(out, 'app'));
const appBytes = readdirSync(join(out, 'app'), { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile())
  .reduce((n, e) => n + statSync(join(e.parentPath, e.name)).size, 0);
console.log(
  `handed in: app/ (${appFiles} files, ${appBytes} bytes) + ${shots} screenshot(s) -> ${out}, dossier.json ${Buffer.byteLength(dossier)} bytes`,
);
