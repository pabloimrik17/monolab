#!/usr/bin/env node
/**
 * check-dossier — layer-1 (deterministic) dossier compliance check.
 * This is the mechanical gate that makes skipped changelog research
 * impossible to smuggle past synthesis. It asserts, against the changelog
 * cache and the bump set:
 *
 *   1. cache coverage — every bump-set package has a cache entry (verified
 *      body or recorded structured error) for its covered versions;
 *   2. chronology blocks — every bump-set package has a
 *      `### <name> (<from> → <to>)` block under `## Changelogs`;
 *   3. required headings — the level/mode-appropriate H2 set is present,
 *      in order;
 *   4. sentinels — empty sections carry their sentinel lines.
 *
 * Usage:
 *   check-dossier.mjs --dossier <dossier.md> --scan <scan.json> \
 *       --level <patch|minor|major|engines> [options]
 *   check-dossier.mjs --dossier <dossier.md> \
 *       --cross-project-plan <file> --level <level> [options]
 *
 * Options:
 *   --mode <single-project|cross-project>   default single-project
 *   --cache-dir <dir>                       default ~/.claude/changelogs
 *
 * Output: JSON { ok, violations: [{ rule, package?, message }] }.
 * Exit codes: 0 = compliant; 1 = violations found; 2 = usage error.
 */

import { readFileSync } from "node:fs";
import {
    defaultCacheRoot,
    listCachedVersions,
    packageCacheDir,
    versionCovered,
} from "./lib/cache.mjs";
import { stableInHalfOpenSpan, stripRangePrefix } from "./lib/semver.mjs";

const SENTINELS = {
    improvements: "_no improvements identified_",
    workarounds: "_no workarounds resolved_",
    skipped: "_no skipped groups_",
    breaking: "_no breaking changes_",
    changelogPkg: "_no changelog available_",
};

function fail(message) {
    process.stderr.write(`check-dossier: ${message}\n`);
    process.exit(2);
}

function parseArgs(argv) {
    const args = {
        cacheRoot: defaultCacheRoot(),
        mode: "single-project",
    };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--dossier") args.dossier = argv[++i];
        else if (a === "--scan") args.scan = argv[++i];
        else if (a === "--cross-project-plan") args.crossPlan = argv[++i];
        else if (a === "--level") args.level = argv[++i];
        else if (a === "--mode") args.mode = argv[++i];
        else if (a === "--cache-dir") args.cacheRoot = argv[++i];
        else fail(`unknown argument "${a}"`);
    }
    if (!args.dossier) fail("--dossier <dossier.md> is required");
    if (!args.scan && !args.crossPlan) {
        fail("--scan or --cross-project-plan is required");
    }
    if (!["patch", "minor", "major", "engines"].includes(args.level)) {
        fail("--level must be one of patch|minor|major|engines");
    }
    if (!["single-project", "cross-project"].includes(args.mode)) {
        fail("--mode must be single-project or cross-project");
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

function buildBumpSet(args) {
    if (args.scan) {
        const scan = readJson(args.scan);
        const byName = new Map();
        for (const u of scan.updates ?? []) {
            if (!byName.has(u.name)) {
                byName.set(u.name, {
                    name: u.name,
                    from: stripRangePrefix(u.currentVersion),
                    to: stripRangePrefix(u.targetVersion),
                });
            }
        }
        return [...byName.values()];
    }
    const plan = readJson(args.crossPlan);
    return (plan.packages ?? plan.updates ?? []).map((p) => ({
        name: p.name,
        from: stripRangePrefix(p.currentVersion ?? ""),
        to: stripRangePrefix(
            p.effectiveTarget ?? p.proposedTarget ?? p.targetVersion ?? "",
        ),
    }));
}

function titleCase(level) {
    return level.charAt(0).toUpperCase() + level.slice(1);
}

/** Expected H2 headings, in order, per level and mode. */
export function expectedHeadings(level, mode) {
    const cross = mode === "cross-project";
    const improvements = cross
        ? "Improvements (universal — applicability checked per project at apply time)"
        : "Improvements (applicable to this codebase)";
    const bumpSet = cross
        ? "Cross-project bump set"
        : `${titleCase(level)} bump set`;
    if (level === "major" || level === "engines") {
        return [
            "Breaking changes & migration",
            improvements,
            "Workarounds resolved",
            "Skipped or unavailable",
            bumpSet,
            "Changelogs",
        ];
    }
    return [
        improvements,
        "Workarounds resolved",
        "Skipped or unavailable",
        bumpSet,
        "Changelogs",
    ];
}

/**
 * Split into H2 sections, breaking ONLY on canonical section titles.
 * The `## Changelogs` section embeds verbatim changelog bodies that carry
 * their own `## …` headings (`## [7.6.0]`, `## Commits`, `## v4.18.0`, …);
 * a naive every-`##` split truncates the section at the first body heading
 * and reports every later package block as missing. Any `## ` line whose
 * title is not canonical is body content. `PR plan` is canonical too — the
 * major flow appends it after `## Changelogs` (retained legacy name).
 */
function h2Sections(content, canonicalTitles) {
    const canonical = new Set([...canonicalTitles, "PR plan"]);
    const lines = content.split("\n");
    const sections = [];
    let current = null;
    for (const line of lines) {
        const m = /^## (.+?)\s*$/.exec(line);
        if (m && canonical.has(m[1])) {
            current = { title: m[1], body: [] };
            sections.push(current);
        } else if (current) {
            current.body.push(line);
        }
    }
    return sections.map((s) => ({ ...s, body: s.body.join("\n") }));
}

export function checkDossier({ content, bumpSet, level, mode, cacheRoot }) {
    const violations = [];
    const expected = expectedHeadings(level, mode);
    const sections = h2Sections(content, expected);
    const titles = sections.map((s) => s.title);

    // 3. Required headings present, in order.
    let lastIndex = -1;
    for (const heading of expected) {
        const idx = titles.indexOf(heading);
        if (idx === -1) {
            violations.push({
                rule: "missing-heading",
                message: `required H2 "## ${heading}" is missing`,
            });
        } else if (idx < lastIndex) {
            violations.push({
                rule: "heading-order",
                message: `"## ${heading}" appears out of order`,
            });
        } else {
            lastIndex = idx;
        }
    }

    const byTitle = new Map();
    for (const s of sections) {
        if (!byTitle.has(s.title)) byTitle.set(s.title, s); // first wins
    }
    const changelogs = byTitle.get("Changelogs");

    // 2. Chronology block per bump-set package.
    for (const pkg of bumpSet) {
        const blockRe = new RegExp(
            `^### ${pkg.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\(`,
            "m",
        );
        if (!changelogs || !blockRe.test(changelogs.body)) {
            violations.push({
                rule: "missing-chronology-block",
                package: pkg.name,
                message: `no "### ${pkg.name} (…)" block under ## Changelogs`,
            });
        }
    }

    // 1. Cache coverage: entry (or recorded error) per bump-set package.
    for (const pkg of bumpSet) {
        const cacheDir = packageCacheDir(pkg.name, cacheRoot);
        const cached = listCachedVersions(cacheDir);
        let span = [];
        if (pkg.from && pkg.to && pkg.from !== pkg.to) {
            try {
                span = stableInHalfOpenSpan(cached, pkg.from, pkg.to);
            } catch {
                span = [];
            }
        }
        const coveredCount = span.filter((v) =>
            versionCovered(cacheDir, v),
        ).length;
        if (coveredCount === 0) {
            // Zero covered versions is acceptable only if the dossier
            // carries the per-package sentinel (recorded unavailability).
            const block =
                changelogs &&
                new RegExp(
                    `### ${pkg.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\([^)]*\\)\\n([\\s\\S]*?)(?=\\n### |$)`,
                ).exec(changelogs.body);
            const hasSentinel =
                block && block[1].includes(SENTINELS.changelogPkg);
            if (!hasSentinel) {
                violations.push({
                    rule: "cache-coverage",
                    package: pkg.name,
                    message: `changelog cache has neither a verified entry nor a recorded error for ${pkg.name} (${pkg.from} → ${pkg.to}), and the dossier block carries no "${SENTINELS.changelogPkg}" sentinel`,
                });
            }
        }
    }

    // 4. Sentinels on empty sections.
    const sentinelChecks = [
        [
            expected.find((h) => h.startsWith("Improvements")),
            SENTINELS.improvements,
        ],
        ["Workarounds resolved", SENTINELS.workarounds],
        ["Skipped or unavailable", SENTINELS.skipped],
    ];
    if (level === "major" || level === "engines") {
        sentinelChecks.unshift([
            "Breaking changes & migration",
            SENTINELS.breaking,
        ]);
    }
    for (const [title, sentinel] of sentinelChecks) {
        const section = byTitle.get(title);
        if (!section) continue; // already reported as missing-heading
        const meaningful = section.body
            .split("\n")
            .filter((l) => l.trim().length > 0);
        if (meaningful.length === 0) {
            violations.push({
                rule: "missing-sentinel",
                message: `"## ${title}" is empty and lacks the "${sentinel}" sentinel`,
            });
        }
    }

    return { ok: violations.length === 0, violations };
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    let content;
    try {
        content = readFileSync(args.dossier, "utf8");
    } catch (err) {
        fail(`cannot read ${args.dossier}: ${err.message}`);
    }
    const result = checkDossier({
        content,
        bumpSet: buildBumpSet(args),
        level: args.level,
        mode: args.mode,
        cacheRoot: args.cacheRoot,
    });
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    process.exit(result.ok ? 0 : 1);
}

const invokedDirectly =
    process.argv[1] &&
    import.meta.url ===
        (await import("node:url")).pathToFileURL(process.argv[1]).href;
if (invokedDirectly) main();
