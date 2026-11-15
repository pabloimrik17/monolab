// Merges every per-project Istanbul coverage-final.json into one file for `fallow health --coverage`.
// Keys are absolute source paths, one project per file, so a plain object merge is lossless.
import { globSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const out = process.argv[2] ?? "coverage/merged/coverage-final.json";
const merged = {};
const inputs = globSync([
    "apps/*/coverage/coverage-final.json",
    "packages/*/coverage/coverage-final.json",
]);
for (const file of inputs) Object.assign(merged, JSON.parse(readFileSync(file, "utf8")));
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(merged));
console.log(`merged ${inputs.length} coverage files -> ${out}`);
