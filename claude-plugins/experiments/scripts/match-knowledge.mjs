#!/usr/bin/env node
/**
 * match-knowledge — D6 classifier. Rebuilds the index, then classifies
 * every scanned `pkg (from → to)` against the knowledge base into `exact`,
 * `overlap`, `prior`, or `related`, and reports counts. Read-only beyond
 * the index rebuild it triggers.
 *
 * Usage:
 *   match-knowledge.mjs [--root <dir>] --groups <groups.json>
 *   match-knowledge.mjs [--root <dir>] --groups -
 *
 * `--root` defaults to `resolveKnowledgeRoot()` when omitted. `--groups` is
 * the `{ groups: [{ groupId, bucketKey, packages: [{ name, from, to }] }] }`
 * object emitted by group-packages-for-research (a bare array is also
 * accepted); `-` reads the same JSON from stdin, for a caller that only
 * holds the groups in-conversation and must not create a scratch file
 * outside the knowledge root.
 *
 * Output: JSON `{ root, baseAbsent, hits, related, summary }`, degrading to
 * `hits: [], related: [], baseAbsent: true` when the root is missing — the
 * caller reads `root` and `baseAbsent` to print `Knowledge: no base at <root>`
 * without probing the filesystem itself. A base that exists but cannot be
 * rebuilt is a different thing and carries `baseAbsent: false` plus `error`,
 * so the caller says `recall failed` rather than asserting a base that is not
 * there. Either way the run continues: recall never aborts it.
 */

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

/**
 * The scanned input already carries `bucketKey` per group — read it from
 * there first. Deriving from `groupId` is a fallback for an incomplete
 * caller only; the derivation goes wrong for any bucket whose name itself
 * ends in digits, so the real value always wins when present.
 */
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
            // A version the comparer cannot parse — a `catalog:` entry, a tag,
            // a workspace protocol — is one candidate's problem, not the run's.
            // Letting it throw would lose every other package's hit as well and
            // turn a recall that had answers into `recall failed`.
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

/**
 * Rebuild-then-match. Both failure modes yield no hits and let the run go on,
 * but they are not the same fact: a base that is not there reads `baseAbsent`,
 * a base that could not be read reads `error`. Calling the second one "no base"
 * would hide a corrupt store behind a routine digest line.
 */
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
        // `resolveKnowledgeRoot` rejecting a relative `knowledge_root` is a
        // user-configuration error, not a crash: it earns the one exact line
        // the store contract fixes, never a stack trace.
        process.stderr.write(`Error: ${err?.message ?? err}\n`);
        process.exit(2);
    }
}
