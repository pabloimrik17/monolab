#!/usr/bin/env node
/**
 * fetch-changelog — deterministic changelog retrieval for the deep-update
 * pipeline. Preserves the `experiments:npm-changelog` cache contract
 * (Strategy A raw CHANGELOG with monorepo cascade, Strategy B GitHub
 * Releases with tag-format probing, Strategy C unpkg CDN fallback,
 * SHA256 write-verification) and the engine release-note path.
 *
 * Usage:
 *   fetch-changelog.mjs <package> <from>..<to> [options]
 *   fetch-changelog.mjs <package> <version>    [options]
 *   fetch-changelog.mjs <package> latest       [options]
 *
 * Options:
 *   --engine            treat <package> as a toolchain engine (node, pnpm,
 *                       npm, yarn, deno, bun). node/deno/bun are always
 *                       engines even without the flag.
 *   --cache-dir <dir>   cache root (default ~/.claude/changelogs)
 *
 * Output: one JSON object on stdout —
 *   { ok, package, from, to, cacheDir, versions: [{ version, status,
 *     source, failReason, retryable, byteSize }], summary: { requested,
 *     cached, fetched, failed }, error }
 *
 * Exit codes: 0 = every requested version verified (fetched or cached);
 * 1 = at least one version failed (structured per-version errors in the
 * JSON — the pipeline records them and continues); 2 = usage/structural
 * error (bad args, unresolvable package).
 */

import { execFileSync } from "node:child_process";
import {
    defaultCacheRoot,
    ensurePackageMeta,
    packageCacheDir,
    rawSourceCacheKey,
    rawSourceFresh,
    readRawSource,
    readVersionMeta,
    updatePackageMeta,
    versionNeedsFetch,
    writeFailedVersion,
    writeRawSource,
    writeVerifiedVersion,
} from "./lib/cache.mjs";
import { detectPattern, extractSections } from "./lib/changelog-parse.mjs";
import {
    ENGINES,
    isEngineRequest,
    nodeVersionsFromDistIndex,
} from "./lib/engines.mjs";
import {
    defaultHttp,
    githubApi,
    parseGithubRepository,
    probeTemplates,
    rawFileUrl,
    resolveDefaultBranch,
    resolveTagTemplate,
    sleep,
    TAG_TEMPLATES,
} from "./lib/github.mjs";
import {
    compare,
    isValid,
    maxVersion,
    stableInRange,
} from "./lib/semver.mjs";

const CHANGELOG_FILENAMES = [
    "CHANGELOG.md",
    "CHANGELOG",
    "History.md",
    "CHANGES.md",
];

function usageError(message) {
    process.stdout.write(
        JSON.stringify({ ok: false, error: message }, null, 2) + "\n",
    );
    process.exit(2);
}

function parseArgs(argv) {
    const args = { engine: false, cacheRoot: defaultCacheRoot() };
    const positional = [];
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--engine") args.engine = true;
        else if (a === "--cache-dir") args.cacheRoot = argv[++i];
        else positional.push(a);
    }
    // Scoped package split across two tokens: `@scope name` → `@scope/name`
    if (
        positional[0]?.startsWith("@") &&
        !positional[0].includes("/") &&
        positional.length >= 3
    ) {
        positional.splice(0, 2, `${positional[0]}/${positional[1]}`);
    }
    if (positional.length !== 2) {
        usageError(
            "usage: fetch-changelog.mjs <package> <from>..<to>|<version>|latest [--engine] [--cache-dir <dir>]",
        );
    }
    args.pkg = positional[0];
    args.versionPart = positional[1];
    return args;
}

function npmView(pkg, fields) {
    try {
        const out = execFileSync("npm", ["view", pkg, ...fields, "--json"], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
            timeout: 60_000,
        });
        return JSON.parse(out);
    } catch {
        return null;
    }
}

/** Resolve FROM/TO from the version part against the stable version list. */
function resolveRange(versionPart, allVersions) {
    if (versionPart.includes("..")) {
        const [from, to] = versionPart.split("..");
        if (!isValid(from) || !isValid(to) || compare(from, to) > 0) {
            return { error: `invalid range "${versionPart}"` };
        }
        return { from, to };
    }
    if (versionPart === "latest") {
        const latest = maxVersion(allVersions.filter(isValid));
        if (!latest) return { error: "no stable versions found" };
        return { from: latest, to: latest };
    }
    if (!isValid(versionPart)) {
        return { error: `invalid version "${versionPart}"` };
    }
    return { from: versionPart, to: versionPart };
}

/** Strategy A: fetch + parse raw changelog files with the monorepo cascade. */
async function strategyA(ctx, fetchVersions) {
    const { cacheDir, meta, owner, repo, http } = ctx;
    const resolved = new Map();
    let fetchErrored = false;
    const branch = await resolveDefaultBranch(owner, repo, { http });
    if (!branch) return { resolved, fetchErrored: true };

    const chains = [];
    if (meta.isMonorepo && meta.monorepoDirectory) {
        chains.push(
            CHANGELOG_FILENAMES.map((f) => `${meta.monorepoDirectory}/${f}`),
        );
    }
    chains.push(CHANGELOG_FILENAMES.slice());

    let remaining = new Set(fetchVersions);
    for (const chain of chains) {
        if (remaining.size === 0) break;
        for (const path of chain) {
            if (remaining.size === 0) break;
            const key = rawSourceCacheKey(path);
            let content = null;
            let sourceUrl = rawFileUrl(owner, repo, branch, path);
            if (rawSourceFresh(cacheDir, key)) {
                content = readRawSource(cacheDir, key);
            } else {
                const res = await http(sourceUrl);
                if (res.status === 200) {
                    content = res.body;
                    writeRawSource(cacheDir, key, content);
                    updatePackageMeta(cacheDir, {
                        changelogSource: "raw_changelog",
                        changelogFiles: [path],
                    });
                } else if (res.status !== 404) {
                    fetchErrored = true;
                    continue;
                }
            }
            if (content === null) continue;
            const sections = extractSections(content);
            for (const version of [...remaining]) {
                if (sections.has(version)) {
                    resolved.set(version, {
                        content: sections.get(version),
                        source: "raw_changelog",
                        sourceUrl,
                    });
                    remaining.delete(version);
                }
            }
            break; // first 200 in this chain wins; cascade handles leftovers
        }
    }

    // Split-archive handling for still-unresolved versions.
    if (remaining.size > 0) {
        const majorsMinors = new Set(
            [...remaining].map((v) => v.split(".").slice(0, 2).join(".")),
        );
        const archivePaths = [
            ...[...majorsMinors].map((mm) => `changelogs/CHANGELOG-${mm}.md`),
            "CHANGELOG_ARCHIVE.md",
        ];
        for (const path of archivePaths) {
            if (remaining.size === 0) break;
            const sourceUrl = rawFileUrl(owner, repo, branch, path);
            const res = await http(sourceUrl);
            if (res.status !== 200) {
                if (res.status !== 404) fetchErrored = true;
                continue;
            }
            writeRawSource(cacheDir, rawSourceCacheKey(path), res.body);
            const sections = extractSections(res.body);
            for (const version of [...remaining]) {
                if (sections.has(version)) {
                    resolved.set(version, {
                        content: sections.get(version),
                        source: "raw_changelog",
                        sourceUrl,
                    });
                    remaining.delete(version);
                }
            }
        }
    }
    return { resolved, fetchErrored };
}

/** Strategy B: GitHub Releases with tag-format probe chain. */
async function strategyB(ctx, versions, tagTemplatesOverride) {
    const { cacheDir, meta, owner, repo, pkg, http } = ctx;
    const resolved = new Map();
    const emptyBody = [];
    const errored = new Set();
    let requestBudget = 30;
    for (const version of versions) {
        const templates =
            tagTemplatesOverride ??
            probeTemplates(pkg, {
                isMonorepo: meta.isMonorepo,
                cachedFormat: meta.tagFormat,
            });
        let hit = false;
        for (const template of templates) {
            if (requestBudget <= 0) {
                await sleep(1_000);
                requestBudget = 30;
            }
            requestBudget--;
            const tag = resolveTagTemplate(template, pkg, version);
            const res = await githubApi(
                `/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(tag)}`,
                { http },
            );
            await sleep(100);
            if (res.status === 200 && res.json) {
                if (
                    !tagTemplatesOverride &&
                    TAG_TEMPLATES.includes(template) &&
                    meta.tagFormat !== template
                ) {
                    meta.tagFormat = template;
                    updatePackageMeta(cacheDir, { tagFormat: template });
                }
                const body = res.json.body;
                if (body && body.trim().length > 0) {
                    resolved.set(version, {
                        content: body,
                        source: "github_releases",
                        sourceUrl: res.json.html_url ?? tag,
                    });
                } else {
                    emptyBody.push(version);
                }
                hit = true;
                break;
            }
            if (res.status !== 404) {
                errored.add(version);
                hit = true;
                break;
            }
        }
        if (!hit) emptyBody.push(version); // all probes 404 → try Strategy C
    }
    return { resolved, strategyCVersions: emptyBody, errored };
}

/** Strategy C: unpkg CDN fallback by published package identity. */
async function strategyC(ctx, versions) {
    const { pkg, http } = ctx;
    const resolved = new Map();
    const failed = new Map();
    for (const version of versions) {
        const url = `https://unpkg.com/${pkg}@${version}/CHANGELOG.md`;
        const res = await http(url);
        if (res.status === 200) {
            const sections = extractSections(res.body);
            const content = sections.get(version) ?? null;
            if (content) {
                resolved.set(version, {
                    content,
                    source: "cdn",
                    sourceUrl: url,
                });
            } else {
                failed.set(version, {
                    failReason: "no_entry_found",
                    retryable: false,
                });
            }
        } else if (res.status === 404) {
            failed.set(version, {
                failReason: "no_changelog_source",
                retryable: false,
            });
        } else {
            failed.set(version, { failReason: "fetch_error", retryable: true });
        }
    }
    return { resolved, failed };
}

async function enumerateEngineVersions(engine, http) {
    const spec = ENGINES[engine];
    if (spec.versionSource === "node-dist") {
        const res = await http("https://nodejs.org/dist/index.json");
        if (res.status !== 200) return null;
        try {
            return nodeVersionsFromDistIndex(JSON.parse(res.body));
        } catch {
            return null;
        }
    }
    const npmName = spec.versionSource.slice("npm:".length);
    const versions = npmView(npmName, ["versions"]);
    return Array.isArray(versions) ? versions : null;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const http = defaultHttp;
    const engineMode = isEngineRequest(args.pkg, args.engine);

    let owner;
    let repo;
    let isMonorepo = false;
    let monorepoDirectory = null;
    let allVersions;
    let tagTemplatesOverride = null;

    if (engineMode) {
        const spec = ENGINES[args.pkg];
        ({ owner, repo } = spec.repo);
        tagTemplatesOverride = spec.tagTemplates;
        allVersions = await enumerateEngineVersions(args.pkg, http);
        if (!allVersions) {
            usageError(
                `could not enumerate versions for engine "${args.pkg}"`,
            );
        }
    } else {
        const view = npmView(args.pkg, ["repository", "versions"]);
        if (!view) usageError(`npm view failed for "${args.pkg}"`);
        const repository = view.repository ?? null;
        const parsed = parseGithubRepository(repository);
        if (!parsed) {
            usageError(
                repository
                    ? `only GitHub-hosted packages are supported for "${args.pkg}"`
                    : `no repository URL found for "${args.pkg}"`,
            );
        }
        ({ owner, repo } = parsed);
        isMonorepo = Boolean(repository?.directory);
        monorepoDirectory = repository?.directory ?? null;
        allVersions = Array.isArray(view.versions)
            ? view.versions
            : [view.versions].filter(Boolean);
    }

    const range = resolveRange(args.versionPart, allVersions);
    if (range.error) usageError(range.error);
    const { from, to } = range;

    let versions = stableInRange(allVersions, from, to);
    if (from === to) {
        // Single-version query: validate existence rather than filtering.
        versions = allVersions.includes(from) ? [from] : [];
        if (versions.length === 0) {
            usageError(`version ${from} not found for "${args.pkg}"`);
        }
    }

    const cacheDir = packageCacheDir(args.pkg, args.cacheRoot);
    const meta = ensurePackageMeta(cacheDir, {
        package: args.pkg,
        repository: `${owner}/${repo}`,
        isMonorepo,
        monorepoDirectory,
    });

    const fetchVersions = versions.filter((v) =>
        versionNeedsFetch(cacheDir, v),
    );
    const results = new Map(); // version → {status, source, failReason, retryable, byteSize}
    for (const v of versions) {
        if (!fetchVersions.includes(v)) {
            const cached = readVersionMeta(cacheDir, v);
            results.set(v, {
                status: cached?.status === "verified" ? "cached" : "skipped",
                source: cached?.source ?? null,
                failReason: cached?.failReason ?? null,
                retryable: cached?.retryable ?? null,
                byteSize: cached?.byteSize ?? null,
            });
        }
    }

    if (fetchVersions.length > 0) {
        const ctx = { cacheDir, meta, owner, repo, pkg: args.pkg, http };
        let resolvedA = new Map();
        let fetchErroredA = false;
        if (!engineMode) {
            ({ resolved: resolvedA, fetchErrored: fetchErroredA } =
                await strategyA(ctx, fetchVersions));
        }
        const unresolvedAfterA = fetchVersions.filter(
            (v) => !resolvedA.has(v),
        );
        const {
            resolved: resolvedB,
            strategyCVersions,
            errored,
        } = unresolvedAfterA.length
            ? await strategyB(ctx, unresolvedAfterA, tagTemplatesOverride)
            : { resolved: new Map(), strategyCVersions: [], errored: new Set() };
        const { resolved: resolvedC, failed: failedC } =
            strategyCVersions.length && !engineMode
                ? await strategyC(ctx, strategyCVersions)
                : { resolved: new Map(), failed: new Map() };

        for (const v of fetchVersions) {
            const hit = resolvedA.get(v) ?? resolvedB.get(v) ?? resolvedC.get(v);
            if (hit) {
                const written = writeVerifiedVersion(
                    cacheDir,
                    v,
                    hit.content,
                    hit,
                );
                results.set(v, {
                    status: written.status === "verified" ? "fetched" : "failed",
                    source: written.source,
                    failReason: written.failReason,
                    retryable: written.retryable,
                    byteSize: written.byteSize,
                });
            } else {
                let failReason;
                let retryable;
                if (fetchErroredA || errored.has(v)) {
                    failReason = "fetch_error";
                    retryable = true;
                } else if (failedC.has(v)) {
                    ({ failReason, retryable } = failedC.get(v));
                } else if (engineMode) {
                    failReason = "no_changelog_source";
                    retryable = false;
                } else {
                    failReason = "no_changelog_source";
                    retryable = false;
                }
                writeFailedVersion(cacheDir, v, failReason, retryable);
                results.set(v, {
                    status: "failed",
                    source: null,
                    failReason,
                    retryable,
                    byteSize: null,
                });
            }
        }
    }

    const list = versions.map((v) => ({ version: v, ...results.get(v) }));
    const summary = {
        requested: versions.length,
        cached: list.filter((r) => r.status === "cached").length,
        fetched: list.filter((r) => r.status === "fetched").length,
        failed: list.filter(
            (r) => r.status === "failed" || r.status === "skipped",
        ).length,
    };
    const ok = list.every(
        (r) => r.status === "cached" || r.status === "fetched",
    );
    process.stdout.write(
        JSON.stringify(
            {
                ok,
                package: args.pkg,
                engine: engineMode,
                from,
                to,
                cacheDir,
                versions: list,
                summary,
                error: null,
            },
            null,
            2,
        ) + "\n",
    );
    process.exit(ok ? 0 : 1);
}

main().catch((err) => {
    process.stdout.write(
        JSON.stringify(
            { ok: false, error: `unexpected: ${err?.message ?? err}` },
            null,
            2,
        ) + "\n",
    );
    process.exit(2);
});
