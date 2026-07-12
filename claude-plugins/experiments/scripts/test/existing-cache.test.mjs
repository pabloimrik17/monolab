/**
 * Validation against the real `~/.claude/changelogs` cache written by the
 * prose `experiments:npm-changelog` flow. Proves the script-side readers
 * consume the pre-existing cache contract byte-for-byte. Opt-in: runs only
 * with CLAUDE_VERIFY_EXISTING_CHANGELOG_CACHE=1 and a non-empty cache
 * (real cache contents vary per machine).
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
    defaultCacheRoot,
    listCachedVersions,
    readPackageMeta,
    readVersionBody,
    readVersionMeta,
    versionCovered,
} from "../lib/cache.mjs";

const root = defaultCacheRoot();
const shouldVerifyExistingCache =
    process.env.CLAUDE_VERIFY_EXISTING_CHANGELOG_CACHE === "1" &&
    existsSync(root) &&
    readdirSync(root).some((d) => !d.startsWith("."));

test("real cache entries parse under the script readers", { skip: !shouldVerifyExistingCache }, () => {
    const packages = readdirSync(root).filter((d) => !d.startsWith("."));
    let verifiedSeen = 0;
    for (const dirName of packages.slice(0, 10)) {
        const dir = join(root, dirName);
        const meta = readPackageMeta(dir);
        if (!meta) continue; // engines or partial dirs may lack _meta.json
        assert.equal(typeof meta.package, "string");
        for (const version of listCachedVersions(dir).slice(0, 5)) {
            const vMeta = readVersionMeta(dir, version);
            assert.ok(vMeta.status === "verified" || vMeta.status === "failed");
            if (vMeta.status === "verified") {
                assert.ok(readVersionBody(dir, version) !== null);
                assert.ok(versionCovered(dir, version));
                verifiedSeen++;
            }
        }
    }
    assert.ok(verifiedSeen > 0, "expected at least one verified entry");
});
