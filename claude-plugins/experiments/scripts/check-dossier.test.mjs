import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "vitest";
import {
    ensurePackageMeta,
    packageCacheDir,
    writeFailedVersion,
    writeVerifiedVersion,
} from "./lib/cache.mjs";
import { checkDossier, expectedHeadings } from "./check-dossier.mjs";

function seededRoot() {
    const root = mkdtempSync(join(tmpdir(), "dossier-"));
    const zod = packageCacheDir("zod", root);
    ensurePackageMeta(zod, { package: "zod", repository: "colinhacks/zod" });
    writeVerifiedVersion(zod, "3.24.1", "## 3.24.1\n- fix", {
        source: "raw_changelog",
        sourceUrl: "u",
    });
    return root;
}

const BUMP_SET = [{ name: "zod", from: "3.23.0", to: "3.24.1" }];

function compliantDossier() {
    return [
        "# Deep-patch dossier: demo",
        "",
        "## Improvements (applicable to this codebase)",
        "",
        "- [high] zod — new refine API. (group: zod-1)",
        "",
        "## Workarounds resolved",
        "",
        "_no workarounds resolved_",
        "",
        "## Skipped or unavailable",
        "",
        "_no skipped groups_",
        "",
        "## Patch bump set",
        "",
        "| package | current → target | location |",
        "| ------- | ---------------- | -------- |",
        "| zod     | 3.23.0 → 3.24.1  | root     |",
        "",
        "## Changelogs",
        "",
        "### zod (3.23.0 → 3.24.1)",
        "",
        "<details><summary>3.24.1</summary>body</details>",
        "",
    ].join("\n");
}

test("expectedHeadings per level and mode", () => {
    assert.deepEqual(expectedHeadings("patch", "single-project"), [
        "Improvements (applicable to this codebase)",
        "Workarounds resolved",
        "Skipped or unavailable",
        "Patch bump set",
        "Changelogs",
    ]);
    assert.ok(
        expectedHeadings("major", "single-project").includes(
            "Breaking changes & migration",
        ),
    );
    assert.deepEqual(
        expectedHeadings("minor", "cross-project")[3],
        "Cross-project bump set",
    );
});

test("compliant dossier passes", () => {
    const result = checkDossier({
        content: compliantDossier(),
        bumpSet: BUMP_SET,
        level: "patch",
        mode: "single-project",
        cacheRoot: seededRoot(),
    });
    assert.deepEqual(result, { ok: true, violations: [] });
});

test("missing chronology block for a bump-set package fails", () => {
    const content = compliantDossier().replace(
        /### zod[\s\S]*$/,
        "### other (1.0.0 → 1.0.1)\n\n_no changelog available_\n",
    );
    const result = checkDossier({
        content,
        bumpSet: BUMP_SET,
        level: "patch",
        mode: "single-project",
        cacheRoot: seededRoot(),
    });
    assert.ok(!result.ok);
    assert.ok(
        result.violations.some(
            (v) => v.rule === "missing-chronology-block" && v.package === "zod",
        ),
    );
});

test("missing required heading fails", () => {
    const content = compliantDossier().replace(
        "## Workarounds resolved\n\n_no workarounds resolved_\n\n",
        "",
    );
    const result = checkDossier({
        content,
        bumpSet: BUMP_SET,
        level: "patch",
        mode: "single-project",
        cacheRoot: seededRoot(),
    });
    assert.ok(
        result.violations.some(
            (v) =>
                v.rule === "missing-heading" &&
                v.message.includes("Workarounds resolved"),
        ),
    );
});

test("empty section without sentinel fails", () => {
    const content = compliantDossier().replace("_no workarounds resolved_", "");
    const result = checkDossier({
        content,
        bumpSet: BUMP_SET,
        level: "patch",
        mode: "single-project",
        cacheRoot: seededRoot(),
    });
    assert.ok(result.violations.some((v) => v.rule === "missing-sentinel"));
});

test("uncovered package fails unless its block carries the sentinel", () => {
    const root = seededRoot(); // cache has zod only
    const bumpSet = [
        ...BUMP_SET,
        { name: "left-pad", from: "1.0.0", to: "1.3.0" },
    ];
    const withoutBlock = checkDossier({
        content: compliantDossier(),
        bumpSet,
        level: "patch",
        mode: "single-project",
        cacheRoot: root,
    });
    assert.ok(
        withoutBlock.violations.some(
            (v) => v.rule === "cache-coverage" && v.package === "left-pad",
        ),
    );
    // Recorded error in cache counts as coverage.
    const lp = packageCacheDir("left-pad", root);
    ensurePackageMeta(lp, { package: "left-pad" });
    writeFailedVersion(lp, "1.3.0", "no_changelog_source", false);
    const content = compliantDossier().replace(
        "## Changelogs\n",
        "## Changelogs\n\n### left-pad (1.0.0 → 1.3.0)\n\n_no changelog available_\n",
    );
    const covered = checkDossier({
        content,
        bumpSet,
        level: "patch",
        mode: "single-project",
        cacheRoot: root,
    });
    assert.ok(!covered.violations.some((v) => v.rule === "cache-coverage"));
});

test("verbatim H2 headings inside changelog bodies do not truncate ## Changelogs", () => {
    // Regression: dry-run 2026-07-12 — bodies with their own `## …` headings
    // (semver `## [7.6.0]`, zod `## v4.18.0`, pnpm `## Commits`) made
    // h2Sections end the Changelogs section early, flagging every LATER
    // package block as missing.
    const root = seededRoot();
    const semver = packageCacheDir("semver", root);
    ensurePackageMeta(semver, {
        package: "semver",
        repository: "npm/node-semver",
    });
    writeVerifiedVersion(semver, "7.6.0", "## [7.6.0]\n- feat", {
        source: "raw_changelog",
        sourceUrl: "u",
    });
    const bumpSet = [
        ...BUMP_SET,
        { name: "semver", from: "7.5.4", to: "7.6.0" },
    ];
    const content = compliantDossier().replace(
        /### zod[\s\S]*$/,
        [
            "### semver (7.5.4 → 7.6.0)",
            "",
            "<details><summary>7.6.0</summary>",
            "",
            "## [7.6.0](https://github.com/npm/node-semver/compare/v7.5.4...v7.6.0) (2024-01-05)",
            "",
            "## Commits",
            "",
            "- some commit",
            "",
            "</details>",
            "",
            "### zod (3.23.0 → 3.24.1)",
            "",
            "<details><summary>3.24.1</summary>body</details>",
            "",
        ].join("\n"),
    );
    const result = checkDossier({
        content,
        bumpSet,
        level: "patch",
        mode: "single-project",
        cacheRoot: root,
    });
    assert.deepEqual(result, { ok: true, violations: [] });
});

test("trailing ## PR plan after ## Changelogs is not swallowed and stays valid", () => {
    const content =
        compliantDossier() +
        [
            "## PR plan",
            "",
            "- Bucket 1 — zod (HIGH). Branch: deps/major-zod.",
            "",
        ].join("\n");
    const result = checkDossier({
        content,
        bumpSet: BUMP_SET,
        level: "patch",
        mode: "single-project",
        cacheRoot: seededRoot(),
    });
    assert.deepEqual(result, { ok: true, violations: [] });
});

test("genuinely missing block still fails when bodies carry H2 headings", () => {
    // The fix must not weaken detection: zod block absent, semver block
    // present with H2-bearing body → zod still flagged.
    const content = compliantDossier().replace(
        /### zod[\s\S]*$/,
        [
            "### other (1.0.0 → 1.0.1)",
            "",
            "<details><summary>1.0.1</summary>",
            "",
            "## v1.0.1 release notes",
            "",
            "</details>",
            "",
        ].join("\n"),
    );
    const result = checkDossier({
        content,
        bumpSet: BUMP_SET,
        level: "patch",
        mode: "single-project",
        cacheRoot: seededRoot(),
    });
    assert.ok(
        result.violations.some(
            (v) => v.rule === "missing-chronology-block" && v.package === "zod",
        ),
    );
});

test("major level requires breaking-changes section before improvements", () => {
    const result = checkDossier({
        content: compliantDossier(),
        bumpSet: BUMP_SET,
        level: "major",
        mode: "single-project",
        cacheRoot: seededRoot(),
    });
    assert.ok(
        result.violations.some(
            (v) =>
                v.rule === "missing-heading" &&
                v.message.includes("Breaking changes & migration"),
        ),
    );
    // Bump-set heading is level-derived: patch heading fails a major check.
    assert.ok(
        result.violations.some(
            (v) =>
                v.rule === "missing-heading" &&
                v.message.includes("Major bump set"),
        ),
    );
});
