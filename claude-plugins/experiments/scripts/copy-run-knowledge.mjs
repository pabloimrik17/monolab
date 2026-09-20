#!/usr/bin/env node
/** Copies one run into the knowledge store and creates its notes and hubs. */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
    appendPreimageMarker,
    buildRunMarker,
    bucketKeyFromGroupId,
    CHANGESET_STATUSES,
    emptySlot,
    findSectionMarker,
    findSlots,
    isSlotUnfilled,
    parseFrontmatter,
    parseResearchPackages,
    pkgSlug,
    resolveKnowledgeRoot,
    serializeFrontmatter,
    stripPreimageMarker,
    universalContent,
} from "./lib/knowledge.mjs";
import { compare } from "./lib/semver.mjs";

function changesetStatusText(status) {
    return CHANGESET_STATUSES.includes(status) ? status : "unknown";
}

function fail(message) {
    process.stderr.write(`copy-run-knowledge: ${message}\n`);
    process.exit(2);
}

function parseArgs(argv) {
    const args = { synthetic: false };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--run-dir") args.runDir = argv[++i];
        else if (a === "--outcome") args.outcome = argv[++i];
        else if (a === "--outcome-file") args.outcomeFile = argv[++i];
        else if (a === "--synthetic") args.synthetic = true;
        else if (a === "--root") args.root = argv[++i];
        else fail(`unknown argument "${a}"`);
    }
    if (!args.runDir) fail("--run-dir <dir> is required");
    if (args.outcome && args.outcomeFile) fail("pass only one of --outcome or --outcome-file");
    return args;
}

function readJson(path) {
    return JSON.parse(readFileSync(path, "utf8"));
}

function readJsonArg(value) {
    const trimmed = value.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) return JSON.parse(trimmed);
    return readJson(value);
}

/** Classifies clean, mixed, failed, and empty project outcomes. */
export function computeRunOutcome(outcome) {
    if (!outcome.projects || outcome.projects.length === 0) return "empty";
    const failures = outcome.projects.map((p) => p.bumps?.failure ?? null);
    if (failures.every((f) => f === null)) return "applied";
    if (failures.some((f) => f === null)) return "partial";
    return "failed";
}

function parseChangesetCounts(content) {
    const applicable = /^## Applicable \((\d+)\)/m.exec(content);
    const inapplicable = /^## Inapplicable \((\d+)\)/m.exec(content);
    return {
        applicable: applicable ? Number(applicable[1]) : null,
        inapplicable: inapplicable ? Number(inapplicable[1]) : null,
    };
}

function hasApplyLog(runDir) {
    const logsDir = join(runDir, "logs");
    if (!existsSync(logsDir)) return false;
    return readdirSync(logsDir).some((f) => /^apply-.*\.log$/.test(f));
}

function reconstructedProject(projectName, cf, runDir) {
    const counts = cf
        ? parseChangesetCounts(readFileSync(cf.absPath, "utf8"))
        : { applicable: null, inapplicable: null };
    return {
        projectName,
        mechanism: "reconstructed",
        bumps: { failure: null, logPath: hasApplyLog(runDir) ? "logs/" : null },
        changeset: {
            status: "unknown",
            path: cf ? cf.relPath : null,
            applicable: counts.applicable,
            inapplicable: counts.inapplicable,
        },
    };
}

function readExistingOutcome(runDir) {
    const path = join(runDir, "outcome.json");
    if (!existsSync(path)) return null;
    try {
        const existing = readJson(path);
        return existing?.projects ? existing : null;
    } catch {
        return null;
    }
}

/** Reconstructs a project only when the run directory contains apply evidence. */
function reconstructedProjects(runDir, meta, changesetFiles) {
    if (meta.mode !== "single-project") {
        return changesetFiles.map((cf) => reconstructedProject(cf.project, cf, runDir));
    }
    if (changesetFiles.length === 0 && !hasApplyLog(runDir)) return [];
    return [reconstructedProject(meta.slug, changesetFiles[0] ?? null, runDir)];
}

export function reconstructOutcome(runDir, meta) {
    const changesetFiles = findChangesetFiles(runDir);
    return {
        runId: meta.planDirName,
        level: meta.level,
        mode: meta.mode,
        gateOption: "unknown",
        projects: reconstructedProjects(runDir, meta, changesetFiles),
    };
}

function findChangesetFiles(runDir) {
    const base = join(runDir, "changesets");
    if (!existsSync(base)) return [];
    const flat = join(base, "changeset.md");
    if (existsSync(flat)) {
        return [{ project: null, relPath: "changesets/changeset.md", absPath: flat }];
    }
    return readdirSync(base, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort()
        .flatMap((project) => {
            const absPath = join(base, project, "changeset.md");
            if (!existsSync(absPath)) return [];
            return [{ project, relPath: `changesets/${project}/changeset.md`, absPath }];
        });
}

function readGroups(runDir) {
    const groupsDir = join(runDir, "groups");
    if (!existsSync(groupsDir)) return [];
    return readdirSync(groupsDir, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort()
        .map((groupId) => {
            const metaPath = join(groupsDir, groupId, "_meta.json");
            const groupMeta = existsSync(metaPath) ? readJson(metaPath) : { packages: [] };
            const researchPath = join(groupsDir, groupId, "research.md");
            const researchContent = existsSync(researchPath)
                ? readFileSync(researchPath, "utf8")
                : "";
            return {
                groupId,
                bucketKey: bucketKeyFromGroupId(groupId),
                packages: groupMeta.packages ?? [],
                researchContent,
            };
        });
}

function collectPackages(groups) {
    const byName = new Map();
    for (const g of groups) {
        const parsedByName = new Map(
            parseResearchPackages(g.researchContent).map((p) => [p.name, p]),
        );
        for (const pkg of g.packages) {
            if (byName.has(pkg.name)) continue;
            byName.set(pkg.name, {
                name: pkg.name,
                from: pkg.from,
                to: pkg.to,
                groupId: g.groupId,
                research: parsedByName.get(pkg.name) ?? null,
            });
        }
    }
    return [...byName.values()];
}

function groupProjectsByName(projects) {
    const order = [];
    const byName = new Map();
    for (const p of projects) {
        if (!byName.has(p.projectName)) {
            byName.set(p.projectName, []);
            order.push(p.projectName);
        }
        byName.get(p.projectName).push(p);
    }
    return order.map((projectName) => ({ projectName, entries: byName.get(projectName) }));
}

const RUNS_BASE = [
    "views:",
    "  - type: table",
    "    name: Runs",
    "    filters:",
    "      and:",
    "        - 'type == \"run\"'",
    "",
].join("\n");
const PACKAGES_BASE = [
    "views:",
    "  - type: table",
    "    name: Packages",
    "    filters:",
    "      and:",
    "        - 'type == \"package\"'",
    "",
].join("\n");

function bootstrapVault(root) {
    mkdirSync(join(root, "runs"), { recursive: true });
    mkdirSync(join(root, "packages"), { recursive: true });
    mkdirSync(join(root, ".obsidian"), { recursive: true });
    const appJsonPath = join(root, ".obsidian", "app.json");
    if (!existsSync(appJsonPath)) writeFileSync(appJsonPath, "{}\n");
    const runsBasePath = join(root, "Runs.base");
    if (!existsSync(runsBasePath)) writeFileSync(runsBasePath, RUNS_BASE);
    const packagesBasePath = join(root, "Packages.base");
    if (!existsSync(packagesBasePath)) writeFileSync(packagesBasePath, PACKAGES_BASE);
    const indexPath = join(root, "index.json");
    if (!existsSync(indexPath)) {
        writeFileSync(indexPath, `${JSON.stringify({ root, runs: [], packages: [] }, null, 2)}\n`);
    }
}

function copyFileInto(runDir, destDir, relPath) {
    const src = join(runDir, relPath);
    if (!existsSync(src)) return;
    const dest = join(destDir, relPath);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, readFileSync(src));
}

function copyAllowlisted(runDir, destDir, groups, changesetFiles) {
    mkdirSync(destDir, { recursive: true });
    copyFileInto(runDir, destDir, "dossier.md");
    copyFileInto(runDir, destDir, "_meta.json");
    copyFileInto(runDir, destDir, "outcome.json");
    for (const g of groups) {
        copyFileInto(runDir, destDir, `groups/${g.groupId}/research.md`);
        copyFileInto(runDir, destDir, `groups/${g.groupId}/_meta.json`);
    }
    for (const cf of changesetFiles) {
        copyFileInto(runDir, destDir, cf.relPath);
    }
}

// Changeset prose is a fallback when no structured entry exists.
function lineTitle(line) {
    const t = line
        .replace(/^#+\s*/, "")
        .replace(/^-\s*/, "")
        .trim();
    const bold = /^\*\*(.+?):?\*\*/.exec(t);
    return (bold ? bold[1] : t).trim();
}

function titlePackageName(line) {
    return lineTitle(line)
        .replace(/^\[[^\]]+\]\s*/, "")
        .split(/\s+/)[0];
}

/** Extracts exact-package titles from H3 or bullet changeset entries. */
function extractSectionTitles(content, headingRe, packageName) {
    let inSection = false;
    const lines = [];
    for (const line of content.split("\n")) {
        if (/^## /.test(line)) {
            inSection = headingRe.test(line);
            continue;
        }
        if (inSection) lines.push(line);
    }
    const entryRe = lines.some((l) => /^### /.test(l)) ? /^### / : /^-\s/;
    return lines
        .filter((line) => entryRe.test(line) && titlePackageName(line) === packageName)
        .map(lineTitle);
}

function buildHubAppliedInfo(packageName, changesetFiles) {
    if (changesetFiles.length === 0) return { text: "no changeset", anyApplicable: false };
    const blocks = [];
    let anyApplicable = false;
    for (const cf of changesetFiles) {
        const content = readFileSync(cf.absPath, "utf8");
        const applicableTitles = extractSectionTitles(content, /^## Applicable/, packageName);
        const inapplicableCount = extractSectionTitles(
            content,
            /^## Inapplicable/,
            packageName,
        ).length;
        if (applicableTitles.length === 0 && inapplicableCount === 0) continue;
        if (applicableTitles.length > 0) anyApplicable = true;
        blocks.push(
            [
                `#### ${cf.project ?? "project"}`,
                "",
                `- applicable: ${applicableTitles.length ? applicableTitles.join("; ") : "none"}`,
                `- inapplicable: ${inapplicableCount ? `${inapplicableCount} title(s)` : "none"}`,
            ].join("\n"),
        );
    }
    return { text: blocks.length ? blocks.join("\n\n") : "_no findings_", anyApplicable };
}

function packageOutcomeWord({ text, anyApplicable }) {
    if (text === "no changeset") return "no changeset";
    return anyApplicable ? "applicable" : "no findings";
}

/** Preserves filled slots while regenerating script-owned note content. */
function carryFilledSlots(oldContent, newContent) {
    if (!oldContent) return newContent;
    const filled = new Map(
        findSlots(oldContent)
            .filter((s) => !isSlotUnfilled(s.content))
            .map((s) => [s.name, s.content]),
    );
    if (filled.size === 0) return newContent;
    let out = "";
    let cursor = 0;
    for (const slot of findSlots(newContent)) {
        const kept = filled.get(slot.name);
        if (kept === undefined) continue;
        out += newContent.slice(cursor, slot.start);
        out += `<!-- slot:${slot.name} -->\n${kept}<!-- /slot -->`;
        cursor = slot.end;
    }
    return out + newContent.slice(cursor);
}

function replaceOrAppendSection(body, runId, newSection) {
    const lines = body.split("\n");
    const headingIdxs = [];
    for (let i = 0; i < lines.length; i++) {
        if (/^## /.test(lines[i])) headingIdxs.push(i);
    }
    for (let h = 0; h < headingIdxs.length; h++) {
        const start = headingIdxs[h];
        const end = h + 1 < headingIdxs.length ? headingIdxs[h + 1] : lines.length;
        const found = findSectionMarker(lines, start);
        if (found && found.marker.runId === runId) {
            const merged = carryFilledSlots(lines.slice(start, end).join("\n"), newSection);
            return [...lines.slice(0, start), ...merged.split("\n"), ...lines.slice(end)].join(
                "\n",
            );
        }
    }
    return `${body.replace(/\s+$/, "")}\n\n${newSection}\n`;
}

function maxVersionString(ranges) {
    return ranges.map((r) => r.split("..")[1]).reduce((a, b) => (compare(a, b) >= 0 ? a : b));
}

function upsertHub(existingContent, params) {
    let data;
    let body;
    if (existingContent) {
        ({ data, body } = parseFrontmatter(existingContent));
    } else {
        data = {
            type: "package",
            name: params.name,
            ranges: [],
            runs: [],
            latest: params.to,
            tags: ["package"],
        };
        body = `\n# ${params.name}\n`;
    }
    const rangeKey = `${params.from}..${params.to}`;
    if (!data.ranges.includes(rangeKey)) data.ranges.push(rangeKey);
    const runLink = `[[runs/${params.runId}]]`;
    if (!data.runs.includes(runLink)) data.runs.push(runLink);
    data.latest = maxVersionString(data.ranges);

    const marker = buildRunMarker({
        runId: params.runId,
        level: params.level,
        mode: params.mode,
        synthetic: params.synthetic,
        supersededBy: null,
    });
    let universalBody = params.universalText ?? "_no findings_";
    if (params.distillNeeded) universalBody = "<!-- distill -->";
    else if (params.researchMissing) universalBody = "<!-- no-research -->";
    const newSection = [
        `## ${params.from} → ${params.to}`,
        "",
        marker,
        "",
        `> [!info] Source: [[runs/${params.runId}]] · ${params.level} · ${params.mode} · ${params.createdAt}`,
        "",
        "### Universal",
        "",
        "<!-- slot:universal -->",
        universalBody,
        "<!-- /slot -->",
        "",
        "### Applied",
        "",
        params.appliedText,
        "",
        "### Summary",
        "",
        emptySlot("summary"),
        "",
    ].join("\n");

    return serializeFrontmatter(data, replaceOrAppendSection(body, params.runId, newSection));
}

function countBumps(bumps) {
    if (!bumps) return 0;
    if (Array.isArray(bumps.appliedGeneric) || Array.isArray(bumps.appliedOverrides)) {
        return (bumps.appliedGeneric?.length ?? 0) + (bumps.appliedOverrides?.length ?? 0);
    }
    if (Array.isArray(bumps.applied)) return bumps.applied.length;
    return 0;
}

function buildPackagesTable(rows) {
    const header = "| package | range | hub | outcome |\n| --- | --- | --- | --- |";
    const body = rows
        .map(
            (r) =>
                `| ${r.name} | ${r.from} → ${r.to} | [[${r.hubPath.replace(/\.md$/, "")}#${r.from} → ${r.to}]] | ${r.outcome} |`,
        )
        .join("\n");
    return `${header}\n${body}`;
}

/** Renders one block per project, merging repeated apply entries. */
function buildAppliedBlock(projectGroups) {
    return projectGroups
        .map(({ projectName, entries }) => {
            const lines = [`### ${projectName}`, ""];
            entries.forEach((p, i) => {
                const label = entries.length > 1 ? `invocation ${i + 1} — ` : "";
                const failed = p.bumps?.failure ? 1 : 0;
                lines.push(`- ${label}bumps: ${countBumps(p.bumps)} applied, ${failed} failed`);
                lines.push(
                    p.changeset?.path
                        ? `- ${label}changeset: ${changesetStatusText(p.changeset.status)} — applicable ${p.changeset.applicable ?? 0}, inapplicable ${p.changeset.inapplicable ?? 0}`
                        : `- ${label}changeset: no changeset`,
                );
            });
            return lines.join("\n");
        })
        .join("\n\n");
}

function buildRunNote(m) {
    const tags = ["run", m.level, m.mode];
    if (m.synthetic) tags.push("synthetic");
    if (m.distilled) tags.push("distilled");
    const data = {
        type: "run",
        runId: m.runId,
        level: m.level,
        mode: m.mode,
        createdAt: m.createdAt,
        persistedAt: m.persistedAt,
        projects: m.projects,
        packages: m.packages,
        outcome: m.outcome,
        gateOption: m.gateOption,
        status: "ok",
        source: m.source,
        tags,
    };
    // `distilled` is the sole conditional frontmatter key.
    if (m.distilled) data.distilled = true;
    const body = [
        `# Run ${m.runId}`,
        "",
        `> [!info] ${m.level} · ${m.mode} · ${m.projects.join(", ")} · ${m.createdAt} — raw artefacts in [[runs/${m.runId}/dossier|dossier]], [[runs/${m.runId}/outcome.json|outcome]]`,
        "",
        "## Summary",
        "",
        "<!-- slot:summary -->",
        "<!-- /slot -->",
        "",
        "## Packages",
        "",
        buildPackagesTable(m.packageRows),
        "",
        "## Applied",
        "",
        buildAppliedBlock(m.projectGroups),
        "",
    ].join("\n");
    return serializeFrontmatter(data, body);
}

/** Prevents `planDirName` from escaping `<root>/runs/`. */
function assertSafeRunId(runId) {
    if (
        typeof runId !== "string" ||
        runId === "" ||
        runId === "." ||
        runId === ".." ||
        /[/\\]/.test(runId)
    ) {
        throw new Error(
            `_meta.json planDirName must be a single path component, got ${JSON.stringify(runId)}`,
        );
    }
}

export function copyRunKnowledge({ runDir, outcome = null, synthetic = false, root = null }) {
    const meta = readJson(join(runDir, "_meta.json"));
    assertSafeRunId(meta.planDirName);
    // Prefer the recorded apply result; reconstruction loses live-run detail.
    const resolvedOutcome =
        outcome ?? readExistingOutcome(runDir) ?? reconstructOutcome(runDir, meta);
    // Refuse identity mismatches before any store write.
    for (const [field, metaValue] of [
        ["runId", meta.planDirName],
        ["level", meta.level],
        ["mode", meta.mode],
    ]) {
        if (resolvedOutcome[field] !== metaValue) {
            throw new Error(
                `outcome.${field} (${JSON.stringify(resolvedOutcome[field])}) does not match _meta.json (${JSON.stringify(metaValue)})`,
            );
        }
    }
    const isLegacySource = (resolvedOutcome.projects ?? []).some(
        (p) => p.mechanism === "reconstructed",
    );
    const runOutcome = computeRunOutcome(resolvedOutcome);
    if (runOutcome === "failed" || runOutcome === "empty") {
        return {
            failed: true,
            reason:
                runOutcome === "empty"
                    ? "outcome.projects is empty: nothing applied, nothing to persist"
                    : "run-level outcome is failed; nothing persisted",
        };
    }

    const knowledgeRoot = root ?? resolveKnowledgeRoot();
    bootstrapVault(knowledgeRoot);

    const recordedAt = new Date().toISOString();
    const stampedOutcome = { ...resolvedOutcome, recordedAt };
    writeFileSync(join(runDir, "outcome.json"), `${JSON.stringify(stampedOutcome, null, 2)}\n`);

    const groups = readGroups(runDir);
    const changesetFiles = findChangesetFiles(runDir);
    const destDir = join(knowledgeRoot, "runs", meta.planDirName);
    copyAllowlisted(runDir, destDir, groups, changesetFiles);

    const packages = collectPackages(groups);
    const hubs = [];
    const packageRows = [];
    let slotCount = 1; // the run note's own summary slot
    let distillCount = 0;
    let noResearchCount = 0;

    for (const pkg of packages) {
        const slug = pkgSlug(pkg.name);
        const hubRelPath = `packages/${slug}.md`;
        const hubAbsPath = join(knowledgeRoot, hubRelPath);
        const existing = existsSync(hubAbsPath)
            ? stripPreimageMarker(readFileSync(hubAbsPath, "utf8"))
            : null;
        const researchMissing = pkg.research === null;
        const distillNeeded = !researchMissing && universalContent(pkg.research) === null;
        const universalText =
            researchMissing || distillNeeded ? null : universalContent(pkg.research);
        const appliedInfo = buildHubAppliedInfo(pkg.name, changesetFiles);

        const updated = upsertHub(existing, {
            name: pkg.name,
            from: pkg.from,
            to: pkg.to,
            runId: meta.planDirName,
            level: meta.level,
            mode: meta.mode,
            createdAt: meta.createdAt,
            synthetic,
            universalText,
            distillNeeded,
            researchMissing,
            appliedText: appliedInfo.text,
        });
        mkdirSync(dirname(hubAbsPath), { recursive: true });
        writeFileSync(hubAbsPath, appendPreimageMarker(updated));

        hubs.push(hubRelPath);
        slotCount += 2; // ### Universal + ### Summary
        if (distillNeeded) distillCount += 1;
        if (researchMissing) noResearchCount += 1;
        packageRows.push({
            name: pkg.name,
            from: pkg.from,
            to: pkg.to,
            hubPath: hubRelPath,
            outcome: packageOutcomeWord(appliedInfo),
        });
    }

    const projectGroups = groupProjectsByName(resolvedOutcome.projects);
    const projects = projectGroups.map((g) => g.projectName);
    const packagesList = packages.map((p) => `${p.name}@${p.from}..${p.to}`);

    const noteContent = buildRunNote({
        runId: meta.planDirName,
        level: meta.level,
        mode: meta.mode,
        createdAt: meta.createdAt,
        persistedAt: recordedAt,
        projects,
        packages: packagesList,
        outcome: isLegacySource ? "legacy" : runOutcome,
        gateOption: resolvedOutcome.gateOption ?? "unknown",
        source: isLegacySource ? "seeded-legacy" : "run-dir",
        synthetic,
        distilled: distillCount > 0,
        packageRows,
        projectGroups,
    });
    const notePath = join(knowledgeRoot, "runs", `${meta.planDirName}.md`);
    const existingNote = existsSync(notePath)
        ? stripPreimageMarker(readFileSync(notePath, "utf8"))
        : null;
    writeFileSync(notePath, appendPreimageMarker(carryFilledSlots(existingNote, noteContent)));

    return {
        root: knowledgeRoot,
        runId: meta.planDirName,
        notePath: `runs/${meta.planDirName}.md`,
        hubs,
        packages: packages.length,
        slots: slotCount,
        distill: distillCount,
        noResearch: noResearchCount,
    };
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const outcome = args.outcomeFile
        ? readJson(args.outcomeFile)
        : args.outcome
          ? readJsonArg(args.outcome)
          : null;
    const result = copyRunKnowledge({
        runDir: args.runDir,
        outcome,
        synthetic: args.synthetic,
        root: args.root,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exit(result.failed ? 1 : 0);
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
