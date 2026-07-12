import assert from "node:assert/strict";
import { mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "vitest";
import {
    ensurePackageMeta,
    listCachedVersions,
    normalizePackageName,
    packageCacheDir,
    rawSourceCacheKey,
    rawSourceFresh,
    readPackageMeta,
    readVersionBody,
    readVersionMeta,
    updatePackageMeta,
    versionCovered,
    versionNeedsFetch,
    writeFailedVersion,
    writeRawSource,
    writeVerifiedVersion,
} from "./cache.mjs";

function tempRoot() {
    return mkdtempSync(join(tmpdir(), "chlog-cache-"));
}

test("normalizePackageName flattens scoped names", () => {
    assert.equal(normalizePackageName("@scope/name"), "@scope__name");
    assert.equal(normalizePackageName("eslint"), "eslint");
});

test("write-verify round trip produces the npm-changelog meta contract", () => {
    const dir = packageCacheDir("demo-pkg", tempRoot());
    ensurePackageMeta(dir, { package: "demo-pkg", repository: "o/r" });
    const meta = writeVerifiedVersion(dir, "1.0.1", "## 1.0.1\n- fix", {
        source: "raw_changelog",
        sourceUrl: "https://raw.example/CHANGELOG.md",
    });
    assert.equal(meta.status, "verified");
    assert.equal(meta.failReason, null);
    assert.ok(meta.sha256);
    assert.equal(meta.sha256, meta.remoteSha256);
    const onDisk = readVersionMeta(dir, "1.0.1");
    assert.deepEqual(onDisk, meta);
    assert.ok(!versionNeedsFetch(dir, "1.0.1"));
    assert.ok(versionCovered(dir, "1.0.1"));
});

test("failed versions: retryable refetches, permanent skips, both covered", () => {
    const dir = packageCacheDir("demo-pkg", tempRoot());
    ensurePackageMeta(dir, { package: "demo-pkg" });
    writeFailedVersion(dir, "1.0.2", "fetch_error", true);
    assert.ok(versionNeedsFetch(dir, "1.0.2"));
    assert.ok(versionCovered(dir, "1.0.2"));
    writeFailedVersion(dir, "1.0.3", "no_changelog_source", false);
    assert.ok(!versionNeedsFetch(dir, "1.0.3"));
    assert.ok(versionCovered(dir, "1.0.3"));
});

test("hash mismatch forces refetch and drops coverage", () => {
    const dir = packageCacheDir("demo-pkg", tempRoot());
    ensurePackageMeta(dir, { package: "demo-pkg" });
    writeVerifiedVersion(dir, "2.0.0", "original body", {
        source: "cdn",
        sourceUrl: "u",
    });
    writeFileSync(join(dir, "2.0.0.md"), "tampered body");
    assert.ok(versionNeedsFetch(dir, "2.0.0"));
    assert.ok(!versionCovered(dir, "2.0.0"));
});

test("tampered body followed by failed refetch leaves no stale body", () => {
    const dir = packageCacheDir("demo-pkg", tempRoot());
    ensurePackageMeta(dir, { package: "demo-pkg" });
    writeVerifiedVersion(dir, "2.1.0", "original body", {
        source: "cdn",
        sourceUrl: "u",
    });
    writeFileSync(join(dir, "2.1.0.md"), "tampered body");
    writeFailedVersion(dir, "2.1.0", "fetch_error", true);
    assert.equal(readVersionBody(dir, "2.1.0"), null);
    assert.ok(versionCovered(dir, "2.1.0"));
});

test("listCachedVersions returns only semver metas", () => {
    const dir = packageCacheDir("demo-pkg", tempRoot());
    ensurePackageMeta(dir, { package: "demo-pkg" });
    writeVerifiedVersion(dir, "1.0.0", "b", { source: "cdn", sourceUrl: "u" });
    writeFailedVersion(dir, "1.1.0", "no_entry_found", false);
    assert.deepEqual(listCachedVersions(dir).sort(), ["1.0.0", "1.1.0"]);
});

test("package meta preserves discoveries and unions changelogFiles", () => {
    const dir = packageCacheDir("demo-pkg", tempRoot());
    ensurePackageMeta(dir, { package: "demo-pkg", repository: "o/r" });
    updatePackageMeta(dir, {
        tagFormat: "v{version}",
        changelogFiles: ["CHANGELOG.md"],
    });
    updatePackageMeta(dir, {
        changelogFiles: ["packages/x/CHANGELOG.md", "CHANGELOG.md"],
    });
    const meta = readPackageMeta(dir);
    assert.equal(meta.tagFormat, "v{version}");
    assert.deepEqual(meta.changelogFiles, ["CHANGELOG.md", "packages/x/CHANGELOG.md"]);
    // ensurePackageMeta must not clobber existing discoveries
    ensurePackageMeta(dir, { package: "demo-pkg" });
    assert.equal(readPackageMeta(dir).tagFormat, "v{version}");
});

test("raw source cache: key flattening, sha sidecar, 24h TTL", () => {
    const dir = packageCacheDir("demo-pkg", tempRoot());
    ensurePackageMeta(dir, { package: "demo-pkg" });
    const key = rawSourceCacheKey("packages/query-core/CHANGELOG.md");
    assert.equal(key, "packages__query-core__CHANGELOG.md");
    writeRawSource(dir, key, "raw content");
    assert.ok(rawSourceFresh(dir, key));
    // sha mismatch → stale
    writeFileSync(join(dir, "_source", key), "tampered");
    assert.ok(!rawSourceFresh(dir, key));
    // age past TTL → stale
    writeRawSource(dir, key, "raw content");
    const old = (Date.now() - 25 * 60 * 60 * 1000) / 1000;
    utimesSync(join(dir, "_source", key), old, old);
    assert.ok(!rawSourceFresh(dir, key));
});
