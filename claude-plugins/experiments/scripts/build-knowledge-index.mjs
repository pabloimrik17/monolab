#!/usr/bin/env node
/**
 * build-knowledge-index — D5 step 4: rebuilds `index.json` from run-note
 * frontmatter, hub markers, and the copied `groups/<gid>/_meta.json` files,
 * and writes `supersededBy` back into the older hub marker it covers.
 *
 * Usage:
 *   build-knowledge-index.mjs [--root <dir>]
 *
 * `--root` defaults to `resolveKnowledgeRoot()` when omitted — callers
 * never need to re-implement D1's expansion/validation rule themselves.
 *
 * Output: JSON `{ root, runs: [...], packages: [...] }` (also written to
 * `<root>/index.json`).
 * Exit codes: 0 = rebuilt; 2 = usage/structural error (missing root).
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
    appendPreimageMarker,
    bucketKeyFromGroupId,
    findSectionMarker,
    parseFrontmatter,
    resolveKnowledgeRoot,
    stripPreimageMarker,
    withSupersededBy,
} from "./lib/knowledge.mjs";
import { compare } from "./lib/semver.mjs";

function fail(message) {
    process.stderr.write(`build-knowledge-index: ${message}\n`);
    process.exit(2);
}

function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--root") {
            const root = argv[++i];
            if (!root || root.startsWith("--")) fail("--root requires a directory");
            args.root = root;
        } else fail(`unknown argument "${a}"`);
    }
    return args;
}

function readRuns(root) {
    const runsDir = join(root, "runs");
    if (!existsSync(runsDir)) return new Map();
    const runs = new Map();
    for (const file of readdirSync(runsDir).filter((f) => f.endsWith(".md"))) {
        const runId = file.slice(0, -".md".length);
        const { data } = parseFrontmatter(readFileSync(join(runsDir, file), "utf8"));
        runs.set(runId, {
            runId,
            notePath: `runs/${file}`,
            level: data.level,
            mode: data.mode,
            createdAt: data.createdAt,
            outcome: data.outcome,
            status: data.status,
            projects: data.projects ?? [],
            tags: data.tags ?? [],
            distilled: data.distilled === true,
        });
    }
    return runs;
}

/** groupId/bucketKey for `packageName`, from the run's copied group metas. */
function findGroupInfo(root, runId, packageName) {
    const groupsDir = join(root, "runs", runId, "groups");
    if (!existsSync(groupsDir)) return { groupId: null, bucketKey: null };
    for (const groupId of readdirSync(groupsDir)) {
        const metaPath = join(groupsDir, groupId, "_meta.json");
        if (!existsSync(metaPath)) continue;
        const meta = JSON.parse(readFileSync(metaPath, "utf8"));
        if ((meta.packages ?? []).some((p) => p.name === packageName)) {
            return { groupId, bucketKey: bucketKeyFromGroupId(groupId) };
        }
    }
    return { groupId: null, bucketKey: null };
}

/** `## <from> → <to>` headings and their marker, a blank line apart per the note templates. */
export function parseRangeHeading(line) {
    if (!line.startsWith("## ")) return null;

    const heading = line.slice(3).trim();
    const unicodeIndex = heading.indexOf("→");
    const asciiIndex = heading.indexOf("->");
    if (unicodeIndex === -1 && asciiIndex === -1) return null;

    const useAscii = asciiIndex !== -1 && (unicodeIndex === -1 || asciiIndex < unicodeIndex);
    const separatorIndex = useAscii ? asciiIndex : unicodeIndex;
    const separatorWidth = useAscii ? 2 : 1;
    const from = heading.slice(0, separatorIndex).trim();
    const to = heading.slice(separatorIndex + separatorWidth).trim();
    if (!from || !to) return null;

    return { from, to };
}

function extractSections(body) {
    const lines = body.split("\n");
    const sections = [];
    for (let i = 0; i < lines.length; i++) {
        const range = parseRangeHeading(lines[i]);
        if (!range) continue;
        const found = findSectionMarker(lines, i);
        if (!found) continue;
        sections.push({
            from: range.from,
            to: range.to,
            anchor: `${range.from} → ${range.to}`,
            marker: found.marker,
            rawLine: lines[found.index],
        });
    }
    return sections;
}

function readHubs(root, runs) {
    const packagesDir = join(root, "packages");
    if (!existsSync(packagesDir)) return [];
    return readdirSync(packagesDir)
        .filter((f) => f.endsWith(".md"))
        .map((file) => {
            const content = readFileSync(join(packagesDir, file), "utf8");
            const { data, body } = parseFrontmatter(content);
            const sections = extractSections(body);
            const ranges = sections.map((s) => {
                const run = runs.get(s.marker.runId);
                const { groupId, bucketKey } = findGroupInfo(root, s.marker.runId, data.name);
                return {
                    from: s.from,
                    to: s.to,
                    anchor: s.anchor,
                    runId: s.marker.runId,
                    notePath: run ? run.notePath : `runs/${s.marker.runId}.md`,
                    level: s.marker.level,
                    mode: s.marker.mode,
                    createdAt: run ? run.createdAt : null,
                    status: run ? run.status : null,
                    groupId,
                    bucketKey,
                    synthetic: s.marker.synthetic,
                    supersededBy: s.marker.supersededBy,
                };
            });
            return {
                name: data.name,
                hubPath: `packages/${file}`,
                latest: data.latest,
                file,
                content,
                sections,
                ranges,
            };
        });
}

/** A later range "covers" an older one when it fully contains it and isn't identical. */
function covers(newer, older) {
    if (newer.from === older.from && newer.to === older.to) return false;
    try {
        return compare(newer.from, older.from) <= 0 && compare(newer.to, older.to) >= 0;
    } catch {
        return false;
    }
}

function computeSupersededBy(hub) {
    for (const older of hub.ranges) {
        let bestRunId = null;
        let bestCreatedAt = null;
        for (const newer of hub.ranges) {
            if (
                newer === older ||
                !covers(newer, older) ||
                !(new Date(newer.createdAt) > new Date(older.createdAt))
            )
                continue;
            if (bestRunId === null || new Date(newer.createdAt) > new Date(bestCreatedAt)) {
                bestRunId = newer.runId;
                bestCreatedAt = newer.createdAt;
            }
        }
        older.supersededBy = bestRunId;
    }
}

function writeBackSupersededBy(hub) {
    let content = hub.content;
    let changed = false;
    for (let i = 0; i < hub.sections.length; i++) {
        const { marker, rawLine } = hub.sections[i];
        const range = hub.ranges[i];
        if (marker.supersededBy === range.supersededBy) continue;
        content = content.replace(rawLine, withSupersededBy(rawLine, range.supersededBy));
        changed = true;
    }
    if (changed) {
        // The marker line sits outside every slot, so `check-knowledge-note.mjs`
        // would read this edit as a model touching script-owned bytes. Restamp.
        content = appendPreimageMarker(stripPreimageMarker(content));
        writeFileSync(join(hub.dir ?? "", hub.file), content);
    }
    return content;
}

export function buildKnowledgeIndex(
    root = resolveKnowledgeRoot(),
    { persistSupersession = true } = {},
) {
    if (!existsSync(root)) {
        throw new Error(`knowledge root does not exist: ${root}`);
    }
    const runs = readRuns(root);
    const hubs = readHubs(root, runs);
    for (const hub of hubs) computeSupersededBy(hub);
    if (persistSupersession) {
        for (const hub of hubs) {
            hub.dir = join(root, "packages");
            writeBackSupersededBy(hub);
        }
    }

    const index = {
        root,
        runs: [...runs.values()],
        packages: hubs.map((h) => ({
            name: h.name,
            hubPath: h.hubPath,
            latest: h.latest,
            ranges: h.ranges,
        })),
    };
    writeFileSync(join(root, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
    return index;
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const index = buildKnowledgeIndex(args.root);
    process.stdout.write(`${JSON.stringify(index, null, 2)}\n`);
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
