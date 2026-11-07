/**
 * Single-source content sync.
 *
 * Lessons are authored once in ../../ai-features-lab/curriculum.js (the vanilla
 * edition) as `window.CURRICULUM = [...]`. This script evaluates that file in a
 * tiny window shim and writes the array to src/data/curriculum.json, which the
 * React app imports.
 *
 *   npm run sync:content     # one-shot (also runs automatically before build)
 *   npm run sync:watch       # initial sync + re-sync on every save (used by dev)
 */
import { readFileSync, writeFileSync, watchFile } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, "../../ai-features-lab/curriculum.js");
const target = resolve(here, "../src/data/curriculum.json");

/** Read the vanilla curriculum, evaluate it, and write the JSON. */
function sync() {
  try {
    const code = readFileSync(source, "utf8");
    const sandbox = { window: {} };
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);

    const data = sandbox.window.CURRICULUM;
    if (!Array.isArray(data) || !data.length) {
      console.error("✗ No CURRICULUM array found in", source);
      return false;
    }
    writeFileSync(target, JSON.stringify(data, null, 2) + "\n");
    console.log(`✓ Synced ${data.length} lessons (${new Date().toLocaleTimeString()})`);
    return true;
  } catch (err) {
    console.error("✗ Content sync failed:", err.message);
    return false;
  }
}

const watch = process.argv.includes("--watch");
const ok = sync();

if (watch) {
  // watchFile polls, which is reliable across editors/platforms (incl. Windows
  // + OneDrive) where fs.watch can miss or double-fire events.
  watchFile(source, { interval: 400 }, sync);
  console.log("👀 Watching curriculum.js for changes…");
} else if (!ok) {
  process.exit(1);
}
