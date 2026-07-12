import assert from "node:assert/strict";
import { test } from "node:test";
import { nodeVersionsFromDistIndex } from "../lib/engines.mjs";
import {
    packageBasename,
    parseGithubRepository,
    probeTemplates,
    resolveTagTemplate,
} from "../lib/github.mjs";

test("parseGithubRepository handles url object, git+, scp, non-github", () => {
    assert.deepEqual(
        parseGithubRepository({
            url: "git+https://github.com/eslint/eslint.git",
        }),
        { owner: "eslint", repo: "eslint" },
    );
    assert.deepEqual(parseGithubRepository("git@github.com:owner/repo.git"), {
        owner: "owner",
        repo: "repo",
    });
    assert.equal(
        parseGithubRepository("https://gitlab.com/owner/repo"),
        null,
    );
    assert.equal(parseGithubRepository(null), null);
});

test("resolveTagTemplate substitutes package, basename, version", () => {
    assert.equal(
        resolveTagTemplate(
            "{package}@{version}",
            "@tanstack/query-core",
            "5.90.20",
        ),
        "@tanstack/query-core@5.90.20",
    );
    assert.equal(
        resolveTagTemplate(
            "{packageBasename}-v{version}",
            "@tanstack/query-core",
            "5.90.20",
        ),
        "query-core-v5.90.20",
    );
    assert.equal(packageBasename("plain"), "plain");
});

test("probeTemplates: cached format first, monorepo variants, unscoped skips", () => {
    const scoped = probeTemplates("@s/n", {
        isMonorepo: true,
        cachedFormat: "{package}@{version}",
    });
    assert.equal(scoped[0], "{package}@{version}");
    assert.ok(scoped.includes("{packageBasename}@{version}"));
    // no duplicate of the cached entry
    assert.equal(
        scoped.filter((t) => t === "{package}@{version}").length,
        1,
    );
    const unscopedMono = probeTemplates("plain", {
        isMonorepo: true,
        cachedFormat: null,
    });
    assert.ok(!unscopedMono.includes("{packageBasename}@{version}"));
    const single = probeTemplates("plain", {
        isMonorepo: false,
        cachedFormat: null,
    });
    assert.deepEqual(single, ["v{version}", "{version}"]);
});

test("nodeVersionsFromDistIndex strips v and sorts stable ascending", () => {
    const versions = nodeVersionsFromDistIndex([
        { version: "v22.11.0" },
        { version: "v22.9.0" },
        { version: "v23.0.0" },
    ]);
    assert.deepEqual(versions, ["22.9.0", "22.11.0", "23.0.0"]);
});
