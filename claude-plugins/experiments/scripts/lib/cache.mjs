/**
 * Changelog-cache helpers. The on-disk contract mirrors the
 * `experiments:npm-changelog` command exactly:
 *
 *   ~/.claude/changelogs/<normalized-name>/
 *   ├── _meta.json            package metadata (repository, tagFormat, ...)
 *   ├── _source/              raw CHANGELOG snapshots + .sha256 sidecars
 *   ├── <ver>.md              verbatim changelog body for one version
 *   └── <ver>.meta.json       per-version status/source/sha metadata
 */

import { createHash } from "node:crypto";
import {
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    statSync,
    unlinkSync,
    writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { isValid } from "./semver.mjs";

export function defaultCacheRoot() {
    return join(homedir(), ".claude", "changelogs");
}

/** `@scope/name` → `@scope__name`; unscoped names pass through. */
export function normalizePackageName(pkg) {
    return pkg.replace(/\//g, "__");
}

export function packageCacheDir(pkg, cacheRoot = defaultCacheRoot()) {
    return join(cacheRoot, normalizePackageName(pkg));
}

export function sha256(content) {
    return createHash("sha256").update(content).digest("hex");
}

export function readJsonIfExists(path) {
    if (!existsSync(path)) return null;
    try {
        return JSON.parse(readFileSync(path, "utf8"));
    } catch {
        return null;
    }
}

export function readPackageMeta(cacheDir) {
    return readJsonIfExists(join(cacheDir, "_meta.json"));
}

export function readVersionMeta(cacheDir, version) {
    return readJsonIfExists(join(cacheDir, `${version}.meta.json`));
}

export function readVersionBody(cacheDir, version) {
    const path = join(cacheDir, `${version}.md`);
    if (!existsSync(path)) return null;
    return readFileSync(path, "utf8");
}

/** All versions that have a `<ver>.meta.json` in the cache dir. */
export function listCachedVersions(cacheDir) {
    if (!existsSync(cacheDir)) return [];
    return readdirSync(cacheDir)
        .filter((f) => f.endsWith(".meta.json") && !f.startsWith("_"))
        .map((f) => f.slice(0, -".meta.json".length))
        .filter(isValid);
}

/**
 * Cache-lookup decision for one version, per the npm-changelog contract:
 * verified + hash match → skip; failed non-retryable → skip; else fetch.
 */
export function versionNeedsFetch(cacheDir, version) {
    const meta = readVersionMeta(cacheDir, version);
    if (!meta) return true;
    if (meta.status === "verified") {
        const body = readVersionBody(cacheDir, version);
        if (body === null) return true;
        return sha256(body) !== meta.sha256;
    }
    if (meta.status === "failed") return meta.retryable !== false;
    return true;
}

/**
 * True when the cache "covers" the version: verified with intact body, or
 * a recorded (structured) failure. Used by the dossier compliance check.
 */
export function versionCovered(cacheDir, version) {
    const meta = readVersionMeta(cacheDir, version);
    if (!meta) return false;
    if (meta.status === "verified") {
        const body = readVersionBody(cacheDir, version);
        return body !== null && sha256(body) === meta.sha256;
    }
    return meta.status === "failed";
}

export function ensurePackageMeta(cacheDir, initial) {
    mkdirSync(join(cacheDir, "_source"), { recursive: true });
    const existing = readPackageMeta(cacheDir) ?? {};
    const merged = {
        package: initial.package,
        repository: existing.repository ?? initial.repository ?? null,
        isMonorepo: existing.isMonorepo ?? initial.isMonorepo ?? false,
        monorepoDirectory:
            existing.monorepoDirectory ?? initial.monorepoDirectory ?? null,
        tagFormat: existing.tagFormat ?? null,
        changelogSource: existing.changelogSource ?? null,
        changelogFiles: existing.changelogFiles ?? [],
        lastUpdated: new Date().toISOString(),
    };
    writeFileSync(
        join(cacheDir, "_meta.json"),
        JSON.stringify(merged, null, 2) + "\n",
    );
    return merged;
}

export function updatePackageMeta(cacheDir, patch) {
    const existing = readPackageMeta(cacheDir) ?? {};
    const merged = { ...existing, ...patch };
    if (patch.changelogFiles) {
        merged.changelogFiles = [
            ...new Set([
                ...(existing.changelogFiles ?? []),
                ...patch.changelogFiles,
            ]),
        ];
    }
    merged.lastUpdated = new Date().toISOString();
    writeFileSync(
        join(cacheDir, "_meta.json"),
        JSON.stringify(merged, null, 2) + "\n",
    );
    return merged;
}

/**
 * Write-and-verify per the npm-changelog Step 8: write body, read back,
 * compare SHA256, retry up to 3 total attempts.
 */
export function writeVerifiedVersion(cacheDir, version, content, meta) {
    const remoteSha = sha256(content);
    const bodyPath = join(cacheDir, `${version}.md`);
    let attempts = 0;
    let verified = false;
    while (attempts < 3 && !verified) {
        attempts++;
        writeFileSync(bodyPath, content);
        verified = sha256(readFileSync(bodyPath, "utf8")) === remoteSha;
    }
    if (!verified && existsSync(bodyPath)) unlinkSync(bodyPath);
    const now = new Date().toISOString();
    const versionMeta = {
        version,
        status: verified ? "verified" : "failed",
        source: verified ? meta.source : null,
        sourceUrl: verified ? meta.sourceUrl : null,
        fetchedAt: now,
        sha256: verified ? remoteSha : null,
        remoteSha256: remoteSha,
        byteSize: verified ? Buffer.byteLength(content) : null,
        failReason: verified ? null : "write_verification_failed",
        retryable: true,
        attempts,
        lastAttempt: now,
    };
    writeFileSync(
        join(cacheDir, `${version}.meta.json`),
        JSON.stringify(versionMeta, null, 2) + "\n",
    );
    return versionMeta;
}

export function writeFailedVersion(cacheDir, version, failReason, retryable) {
    mkdirSync(cacheDir, { recursive: true });
    const bodyPath = join(cacheDir, `${version}.md`);
    if (existsSync(bodyPath)) unlinkSync(bodyPath);
    const now = new Date().toISOString();
    const versionMeta = {
        version,
        status: "failed",
        source: null,
        sourceUrl: null,
        fetchedAt: now,
        sha256: null,
        remoteSha256: null,
        byteSize: null,
        failReason,
        retryable,
        attempts: (readVersionMeta(cacheDir, version)?.attempts ?? 0) + 1,
        lastAttempt: now,
    };
    writeFileSync(
        join(cacheDir, `${version}.meta.json`),
        JSON.stringify(versionMeta, null, 2) + "\n",
    );
    return versionMeta;
}

/** Raw-source cache key: path-qualified names flatten `/` → `__`. */
export function rawSourceCacheKey(path) {
    return path.replace(/\//g, "__");
}

/** 24h TTL + sha256 sidecar check for a cached raw source file. */
export function rawSourceFresh(cacheDir, cacheKey, now = Date.now()) {
    const path = join(cacheDir, "_source", cacheKey);
    const shaPath = `${path}.sha256`;
    if (!existsSync(path) || !existsSync(shaPath)) return false;
    const ageMs = now - statSync(path).mtimeMs;
    if (ageMs >= 24 * 60 * 60 * 1000) return false;
    const stored = readFileSync(shaPath, "utf8").trim();
    return sha256(readFileSync(path, "utf8")) === stored;
}

export function readRawSource(cacheDir, cacheKey) {
    const path = join(cacheDir, "_source", cacheKey);
    if (!existsSync(path)) return null;
    return readFileSync(path, "utf8");
}

export function writeRawSource(cacheDir, cacheKey, content) {
    mkdirSync(join(cacheDir, "_source"), { recursive: true });
    const path = join(cacheDir, "_source", cacheKey);
    writeFileSync(path, content);
    writeFileSync(`${path}.sha256`, sha256(content) + "\n");
}
