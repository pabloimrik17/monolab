#!/usr/bin/env node
/**
 * semver-max-wins — deterministic cross-project version alignment.
 * Given per-project ScanResults, deduplicates packages and computes the
 * max-wins effectiveTarget plus the most-common representative
 * currentVersion per package (the orchestrator's Step 6 arithmetic,
 * moved out of prose).
 *
 * Usage:
 *   semver-max-wins.mjs --scan-by-project <scan-by-project.json>
 *
 * Input: { [projectName]: ScanResult } (ScanResult per scan-npm-updates).
 * Output JSON:
 *   { packages: [{ name, effectiveTarget, mostCommonCurrent,
 *       occurrences: [{ projectName, currentVersion, targetVersion,
 *                       location, sourceFile }] }] }
 * Packages sorted alphabetically; occurrences preserve project order.
 * Exit codes: 0 = ok; 2 = usage/input error.
 */

import { readFileSync } from "node:fs";
import { maxWins } from "./lib/semver.mjs";

function fail(message) {
    process.stderr.write(`semver-max-wins: ${message}\n`);
    process.exit(2);
}

function main() {
    const argv = process.argv.slice(2);
    let inputPath = null;
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === "--scan-by-project") inputPath = argv[++i];
        else fail(`unknown argument "${argv[i]}"`);
    }
    if (!inputPath) fail("--scan-by-project <file> is required");

    let scans;
    try {
        scans = JSON.parse(readFileSync(inputPath, "utf8"));
    } catch (err) {
        fail(`cannot read ${inputPath}: ${err.message}`);
    }

    const byName = new Map();
    for (const [projectName, scan] of Object.entries(scans)) {
        for (const u of scan?.updates ?? []) {
            if (!byName.has(u.name)) byName.set(u.name, []);
            byName.get(u.name).push({
                projectName,
                currentVersion: u.currentVersion,
                targetVersion: u.targetVersion,
                location: u.location,
                sourceFile: u.sourceFile,
            });
        }
    }

    const packages = [...byName.entries()]
        .map(([name, occurrences]) => {
            const { effectiveTarget, mostCommonCurrent } = maxWins(occurrences);
            return { name, effectiveTarget, mostCommonCurrent, occurrences };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

    process.stdout.write(JSON.stringify({ packages }, null, 2) + "\n");
}

main();
