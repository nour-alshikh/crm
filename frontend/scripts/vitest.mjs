// Runs Vitest from the on-disk-cased project path.
//
// On Windows a lowercase drive letter in the cwd (VS Code and Git Bash
// terminals often give "d:\…") makes Vitest load its runner and the test
// setup file under two differently-cased paths, and every file fails with
// "Vitest failed to find the runner". Re-launching from realpath fixes it and
// is a no-op elsewhere. Args are passed through: `npm run test -- --watch`.
import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = realpathSync.native(join(dirname(fileURLToPath(import.meta.url)), ".."));
const bin = join(root, "node_modules", "vitest", "vitest.mjs");

const { status } = spawnSync(process.execPath, [bin, ...process.argv.slice(2)], {
  cwd: root,
  stdio: "inherit",
});

process.exit(status ?? 1);
