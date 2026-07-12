#!/usr/bin/env node
/**
 * assemble-chronology — builds the `## Changelogs` section of `dossier.md`
 * deterministically from the on-disk changelog cache. No network, no agent
 * re-typing. One block per bump-set package, alphabetical; within a block,
 * verbatim cached bodies for every stable version in the half-open span
 * (from, to], ascending, each wrapped in <details>.
 *
 * Usage:
 *   assemble-chronology.mjs --scan <scan.json> [options]
 *   assemble-chronology.mjs --cross-project-plan <cross-project-plan.json> \
 *       --scan-by-project <scan-by-project.json> [options]
 *
 * Options:
 *   --cache-dir <dir>   cache root (default ~/.claude/changelogs)
 *   --out <file>        write the section to a file instead of stdout
 *
 * Bump-set sources:
 *   single-project  scan.json `updates[]` → name, currentVersion, targetVersion
 *   cross-project   cross-project-plan.json packages → name, effectiveTarget;
 *                   representative current = most-common currentVersion
 *                   across scan-by-project.json occurrences.
 *
 * Exit codes: 0 = section written; 2 = usage/input error.
 */

import { readFileSync, writeFileSync } from "node:fs";
import {
    defaultCacheRoot,
    listCachedVersions,
    packageCacheDir,
    readPackageMeta,
    readVersionBody,
    readVersionMeta,
    sha256,
} from "./lib/cache.mjs";
import {
    mostCommon,
    stableInHalfOpenSpan,
    stripRangePrefix,
} from "./lib/semver.mjs";

function fail(message) {
    process.stderr.write(`assemble-chronology: ${message}\n`);
    process.exit(2);
}

function parseArgs(argv) {
    const args = { cacheRoot: defaultCacheRoot(), out: null };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--scan") args.scan = argv[++i];
        else if (a === "--cross-project-plan") args.crossPlan = argv[++i];
        else if (a === "--scan-by-project") args.scanByProject = argv[++i];
        else if (a === "--cache-dir") args.cacheRoot = argv[++i];
        else if (a === "--out") args.out = argv[++i];
        else fail(`unknown argument "${a}"`);
    }
    if (!args.scan && !args.crossPlan) {
        fail("--scan <scan.json> or --cross-project-plan <file> is required");
    }
    return args;
}

function readJson(path) {
    try {
        return JSON.parse(readFileSync(path, "utf8"));
    } catch (err) {
        fail(`cannot read ${path}: ${err.message}`);
    }
}

/** [{ name, from, to }] alphabetical by name. */
function buildBumpSet(args) {
    if (args.scan) {
        const scan = readJson(args.scan);
        if (!Array.isArray(scan.updates)) fail("scan.json has no updates[]");
        const byName = new Map();
        for (const u of scan.updates) {
            if (!byName.has(u.name)) {
                byName.set(u.name, {
                    name: u.name,
                    from: stripRangePrefix(u.currentVersion),
                    to: stripRangePrefix(u.targetVersion),
                });
            }
        }
        return [...byName.values()].sort((a, b) =>
            a.name.localeCompare(b.name),
        );
    }
    const plan = readJson(args.crossPlan);
    const scans = args.scanByProject ? readJson(args.scanByProject) : {};
    const packages = plan.packages ?? plan.updates ?? [];
    if (!Array.isArray(packages)) {
        fail("cross-project-plan.json has no packages[]");
    }
    return packages
        .map((p) => {
            const currents = [];
            for (const scan of Object.values(scans)) {
                for (const u of scan.updates ?? []) {
                    if (u.name === p.name) {
                        currents.push(stripRangePrefix(u.currentVersion));
                    }
                }
            }
            const fromOccurrences = (p.occurrences ?? []).map((o) =>
                stripRangePrefix(o.currentVersion),
            );
            const representative =
                mostCommon(currents.length ? currents : fromOccurrences) ??
                stripRangePrefix(p.currentVersion ?? "");
            return {
                name: p.name,
                from: representative,
                to: stripRangePrefix(
                    p.effectiveTarget ??
                        p.proposedTarget ??
                        p.targetVersion ??
                        "",
                ),
            };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
}

function linksLine(cacheDir, versions) {
    const meta = readPackageMeta(cacheDir);
    const parts = [];
    if (meta?.repository) {
        parts.push(
            `[repository](https://github.com/${meta.repository})`,
        );
    }
    for (const v of versions) {
        const vMeta = readVersionMeta(cacheDir, v);
        if (vMeta?.sourceUrl) parts.push(`[${v}](${vMeta.sourceUrl})`);
    }
    return parts.length ? `Sources: ${parts.join(" · ")}` : null;
}

function packageBlock(pkg, cacheRoot) {
    const cacheDir = packageCacheDir(pkg.name, cacheRoot);
    const lines = [`### ${pkg.name} (${pkg.from} → ${pkg.to})`, ""];
    let covered = [];
    if (pkg.from && pkg.to && pkg.from !== pkg.to) {
        covered = stableInHalfOpenSpan(
            listCachedVersions(cacheDir),
            pkg.from,
            pkg.to,
        );
    } else if (pkg.from === pkg.to && pkg.to) {
        covered = []; // empty half-open span
    }
    const withBodies = covered.filter((v) => {
        const vMeta = readVersionMeta(cacheDir, v);
        if (vMeta?.status !== "verified") return false;
        const body = readVersionBody(cacheDir, v);
        return body !== null && sha256(body) === vMeta.sha256;
    });
    const links = linksLine(cacheDir, withBodies);
    if (links) lines.push(links, "");
    if (withBodies.length === 0) {
        lines.push("_no changelog available_", "");
        return lines.join("\n");
    }
    for (const v of withBodies) {
        const body = readVersionBody(cacheDir, v);
        lines.push(
            "<details>",
            `<summary>${v}</summary>`,
            "",
            body.trimEnd(),
            "",
            "</details>",
            "",
        );
    }
    return lines.join("\n");
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const bumpSet = buildBumpSet(args);
    const blocks = bumpSet.map((pkg) => packageBlock(pkg, args.cacheRoot));
    const section = ["## Changelogs", "", ...blocks].join("\n").trimEnd() + "\n";
    if (args.out) {
        writeFileSync(args.out, section);
        process.stderr.write(
            `assemble-chronology: wrote ${bumpSet.length} package block(s) to ${args.out}\n`,
        );
    } else {
        process.stdout.write(section);
    }
}

main();
