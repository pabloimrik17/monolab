#!/usr/bin/env node
/**
 * copy-run-knowledge — D5 step 1 of the persist pipeline. Stamps
 * `recordedAt` onto the assembled outcome object and writes it as
 * `<runDir>/outcome.json`, bootstraps the knowledge vault on first use,
 * copies the allowlisted run artefacts, and writes the run note plus every
 * package hub section with slots left empty — except `### Universal`,
 * which the script fills directly from non-legacy research. Research that
 * predates the universal/this-project split gets the `<!-- distill -->`
 * marker; a package whose group produced no `research.md` at all gets
 * `<!-- no-research -->`, which is not a distillation and never sets
 * `distilled: true`.
 *
 * Usage:
 *   copy-run-knowledge.mjs --run-dir <dir>
 *       [--outcome <json> | --outcome-file <path>] [--synthetic] [--root <dir>]
 *
 * `--outcome`/`--outcome-file` carry the object described in the
 * `outcome.json` contract, minus `recordedAt`. Omit both to have the script
 * reconstruct one from the run directory (changeset counts, apply-log
 * presence) — the seeding path for legacy run directories. `--root`
 * defaults to `resolveKnowledgeRoot()` when omitted.
 *
 * `outcome.projects[]` may carry more than one entry per project — one per
 * apply invocation (e.g. one per bucket at `level: major`); they are
 * grouped by `projectName` when rendering the run note.
 *
 * `projects[].changeset.status` is one of `lib/knowledge.mjs`'s
 * `CHANGESET_STATUSES` (six values, including `verification-failed`);
 * this script passes it through to the run note and hub verbatim.
 *
 * Output: JSON digest `{ root, runId, notePath, hubs, packages, slots,
 * distill, noResearch }`, or `{ failed: true, reason }` when the run-level outcome is
 * `failed` or `outcome.projects` is empty.
 * Exit codes: 0 = persisted; 1 = nothing persisted (see `reason`);
 * 2 = usage/structural error.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
    appendPreimageMarker,
    buildRunMarker,
    bucketKeyFromGroupId,
    CHANGESET_STATUSES,
    emptySlot,
    findSectionMarker,
    parseFrontmatter,
    parseResearchPackages,
    pkgSlug,
    resolveKnowledgeRoot,
    serializeFrontmatter,
    stripPreimageMarker,
    universalContent,
} from "./lib/knowledge.mjs";
import { compare } from "./lib/semver.mjs";

/** Verbatim pass-through, defended against a value outside the six-status enum. */
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

/**
 * `applied` when every project entry is clean, `partial` when at least one
 * is clean and at least one is not, `failed` when none is, `empty` when
 * `projects` has no entry (D4's derivation is vacuously "applied" on an
 * empty array; the caller must refuse that case instead of persisting it).
 */
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

/** The run's own apply record, when it kept one. */
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

/** A run directory with no `outcome.json`: reconstruct one (D5/persist-skill "Legacy run handling"). */
export function reconstructOutcome(runDir, meta) {
    const changesetFiles = findChangesetFiles(runDir);
    const projects =
        meta.mode === "single-project"
            ? [reconstructedProject(meta.slug, changesetFiles[0] ?? null, runDir)]
            : changesetFiles.map((cf) => reconstructedProject(cf.project, cf, runDir));
    return {
        runId: meta.planDirName,
        level: meta.level,
        mode: meta.mode,
        gateOption: "unknown",
        projects,
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

/** Union of every group's packages, first-group-wins, paired with its research section. */
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

/** `outcome.projects[]` may hold several entries per project (one per apply invocation). */
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

// Best-effort: the changeset prose has no per-package structure, only
// free-form titles. Shape follows note-templates.md's illustrative
// `#### <project>` / applicable / inapplicable layout.
function lineTitle(line) {
    const t = line
        .replace(/^#+\s*/, "")
        .replace(/^-\s*/, "")
        .trim();
    // Bullet entries lead with a bold title: `**[low] zod — …:** rationale`.
    const bold = /^\*\*(.+?):?\*\*/.exec(t);
    return (bold ? bold[1] : t).trim();
}

/**
 * Titles of the entries naming `packageName` under the `## Applicable` /
 * `## Inapplicable` heading `headingRe` matches. A section either lists its
 * entries as `###` headings — whose own `- **File:** …` lines are the entry's
 * fields, not entries — or as top-level bullets; never both.
 */
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
    return lines.filter((l) => entryRe.test(l) && l.includes(packageName)).map(lineTitle);
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
            return [...lines.slice(0, start), ...newSection.split("\n"), ...lines.slice(end)].join(
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

/**
 * One `### <project>` block per distinct project, even when several
 * `outcome.projects[]` entries share that name (one per apply invocation,
 * e.g. per bucket at `level: major`) — never one row per invocation.
 */
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
    // run-knowledge-store's exact-key list and persist-run-knowledge-skill's
    // "distilled: true" requirement disagree; per the orchestrator ruling,
    // treat the thirteen as always-present and this as a 14th conditional
    // key, written here (never by a model), absent when the run isn't
    // legacy-distilled.
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

export function copyRunKnowledge({ runDir, outcome = null, synthetic = false, root = null }) {
    const meta = readJson(join(runDir, "_meta.json"));
    // Reconstruction is the last resort, not the default: a run directory that
    // already holds an `outcome.json` holds the real apply record, and
    // rebuilding one over it would downgrade a persisted `applied` run to
    // `legacy` and lose the gate option and changeset statuses for good.
    const resolvedOutcome =
        outcome ?? readExistingOutcome(runDir) ?? reconstructOutcome(runDir, meta);
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
    writeFileSync(
        join(knowledgeRoot, "runs", `${meta.planDirName}.md`),
        appendPreimageMarker(noteContent),
    );

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
        // `resolveKnowledgeRoot` rejecting a relative `knowledge_root` is a
        // user-configuration error, not a crash: it earns the one exact line
        // the store contract fixes, never a stack trace.
        process.stderr.write(`Error: ${err?.message ?? err}\n`);
        process.exit(2);
    }
}
