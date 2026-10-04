#!/usr/bin/env node
/** Rebuilds the index and classifies scanned package ranges against prior runs. */

import { existsSync, readFileSync } from "node:fs";
import { buildKnowledgeIndex } from "./build-knowledge-index.mjs";
import { bucketKeyFromGroupId, classifyRange, resolveKnowledgeRoot } from "./lib/knowledge.mjs";

function fail(message) {
    process.stderr.write(`match-knowledge: ${message}\n`);
    process.exit(2);
}

function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--root") args.root = argv[++i];
        else if (a === "--groups") args.groups = argv[++i];
        else fail(`unknown argument "${a}"`);
    }
    if (!args.groups) fail("--groups <groups.json>|- is required");
    return args;
}

function readGroupsInput(value) {
    const raw = value === "-" ? readFileSync(0, "utf8") : readFileSync(value, "utf8");
    return JSON.parse(raw);
}

/** Prefers the explicit bucket key; deriving it can lose numeric suffixes. */
function flattenGroups(groupsInput) {
    const groups = Array.isArray(groupsInput) ? groupsInput : (groupsInput.groups ?? []);
    return groups.flatMap((g) =>
        (g.packages ?? []).map((p) => ({
            name: p.name,
            from: p.from,
            to: p.to,
            groupId: g.groupId,
            bucketKey: g.bucketKey ?? bucketKeyFromGroupId(g.groupId),
        })),
    );
}

function emptyResult(root, packageCount) {
    return {
        root,
        baseAbsent: true,
        hits: [],
        related: [],
        summary: { exact: 0, overlap: 0, prior: 0, related: 0, packages: packageCount },
    };
}

const CLASS_RANK = { exact: 0, overlap: 1, prior: 2 };

function isExcluded(range) {
    return range.synthetic === true || range.status === "draft";
}

function candidatesForPackage(index, pkg) {
    const entry = index.packages.find((p) => p.name === pkg.name);
    if (!entry) return [];
    return entry.ranges
        .filter((range) => !isExcluded(range))
        .map((range) => {
            // One unparseable candidate must not fail the whole recall.
            let classified;
            try {
                classified = classifyRange(
                    { from: range.from, to: range.to },
                    { from: pkg.from, to: pkg.to },
                );
            } catch {
                return null;
            }
            return classified ? { ...classified, range, hubPath: entry.hubPath } : null;
        })
        .filter(Boolean);
}

function pickBest(candidates) {
    if (candidates.length === 0) return null;
    return candidates.reduce((best, c) => {
        if (!best) return c;
        if (CLASS_RANK[c.class] !== CLASS_RANK[best.class]) {
            return CLASS_RANK[c.class] < CLASS_RANK[best.class] ? c : best;
        }
        return new Date(c.range.createdAt) > new Date(best.range.createdAt) ? c : best;
    }, null);
}

function relatedHubsForBucket(index, bucketKey, excludeName) {
    const hubs = new Set();
    for (const entry of index.packages) {
        if (entry.name === excludeName) continue;
        for (const range of entry.ranges) {
            if (isExcluded(range)) continue;
            if (range.bucketKey === bucketKey) hubs.add(entry.hubPath);
        }
    }
    return [...hubs];
}

export function matchKnowledge(index, groupsInput) {
    const packages = flattenGroups(groupsInput);
    const hits = [];
    const related = [];

    for (const pkg of packages) {
        const best = pickBest(candidatesForPackage(index, pkg));
        if (best) {
            hits.push({
                name: pkg.name,
                from: pkg.from,
                to: pkg.to,
                groupId: pkg.groupId,
                class: best.class,
                runId: best.range.runId,
                priorFrom: best.range.from,
                priorTo: best.range.to,
                delta: best.delta,
                hubPath: best.hubPath,
                anchor: best.range.anchor,
                notePath: best.range.notePath,
                level: best.range.level,
                mode: best.range.mode,
                createdAt: best.range.createdAt,
            });
            continue;
        }
        const hubs = relatedHubsForBucket(index, pkg.bucketKey, pkg.name);
        if (hubs.length > 0) {
            related.push({ name: pkg.name, groupId: pkg.groupId, bucketKey: pkg.bucketKey, hubs });
        }
    }

    const summary = {
        exact: hits.filter((h) => h.class === "exact").length,
        overlap: hits.filter((h) => h.class === "overlap").length,
        prior: hits.filter((h) => h.class === "prior").length,
        related: related.length,
        packages: packages.length,
    };
    return { root: index.root, baseAbsent: false, hits, related, summary };
}

/** Distinguishes an absent base from a base that failed to rebuild. */
export function recallAgainstRoot(root, groupsInput) {
    const resolvedRoot = root ?? resolveKnowledgeRoot();
    const packageCount = flattenGroups(groupsInput).length;
    if (!existsSync(resolvedRoot)) return emptyResult(resolvedRoot, packageCount);
    let index;
    try {
        index = buildKnowledgeIndex(resolvedRoot, { persistSupersession: false });
    } catch (err) {
        return {
            ...emptyResult(resolvedRoot, packageCount),
            baseAbsent: false,
            error: err?.message ?? String(err),
        };
    }
    return matchKnowledge(index, groupsInput);
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const groupsInput = readGroupsInput(args.groups);
    const result = recallAgainstRoot(args.root, groupsInput);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exit(0);
}

const invokedDirectly =
    process.argv[1] &&
    import.meta.url === (await import("node:url")).pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
    try {
        main();
    } catch (err) {
        // Configuration errors return one line, never a stack trace.
        process.stderr.write(`Error: ${err?.message ?? err}\n`);
        process.exit(2);
    }
}
