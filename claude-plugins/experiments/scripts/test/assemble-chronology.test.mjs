import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
    ensurePackageMeta,
    packageCacheDir,
    updatePackageMeta,
    writeFailedVersion,
    writeVerifiedVersion,
} from "../lib/cache.mjs";

const SCRIPT = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "assemble-chronology.mjs",
);

function seedCache(root) {
    // zod: two fetched versions inside the span + the installed one (excluded)
    const zod = packageCacheDir("zod", root);
    ensurePackageMeta(zod, { package: "zod", repository: "colinhacks/zod" });
    updatePackageMeta(zod, { repository: "colinhacks/zod" });
    for (const [v, body] of [
        ["3.23.0", "## 3.23.0\n- installed version body (must NOT render)"],
        ["3.23.5", "## 3.23.5\n- mid fix"],
        ["3.24.1", "## 3.24.1\n- target fix"],
    ]) {
        writeVerifiedVersion(zod, v, body, {
            source: "raw_changelog",
            sourceUrl: `https://raw.example/zod/${v}`,
        });
    }
    // axios: nothing available → sentinel (recorded error only)
    const axios = packageCacheDir("axios", root);
    ensurePackageMeta(axios, { package: "axios", repository: "axios/axios" });
    writeFailedVersion(axios, "1.7.9", "no_changelog_source", false);
}

function run(args) {
    return execFileSync(process.execPath, [SCRIPT, ...args], {
        encoding: "utf8",
    });
}

test("assembles alphabetical blocks, half-open span, details wrappers, sentinel", () => {
    const root = mkdtempSync(join(tmpdir(), "chrono-"));
    seedCache(root);
    const scanPath = join(root, "scan.json");
    writeFileSync(
        scanPath,
        JSON.stringify({
            updates: [
                {
                    name: "zod",
                    currentVersion: "^3.23.0",
                    targetVersion: "^3.24.1",
                },
                {
                    name: "axios",
                    currentVersion: "1.7.0",
                    targetVersion: "1.7.9",
                },
            ],
        }),
    );
    const out = run(["--scan", scanPath, "--cache-dir", root]);

    assert.match(out, /^## Changelogs/m);
    // alphabetical: axios before zod
    assert.ok(out.indexOf("### axios") < out.indexOf("### zod"));
    assert.match(out, /### zod \(3\.23\.0 → 3\.24\.1\)/);
    // half-open span: installed 3.23.0 excluded, 3.23.5 + 3.24.1 included ascending
    assert.ok(!out.includes("installed version body"));
    assert.ok(out.indexOf("<summary>3.23.5</summary>") <
        out.indexOf("<summary>3.24.1</summary>"));
    assert.match(out, /<details>\n<summary>3\.23\.5<\/summary>/);
    assert.match(out, /- mid fix/);
    // links line from cached metadata
    assert.match(out, /\[repository\]\(https:\/\/github\.com\/colinhacks\/zod\)/);
    assert.match(out, /\[3\.24\.1\]\(https:\/\/raw\.example\/zod\/3\.24\.1\)/);
    // axios has no bodies → links line (repo known) then sentinel
    assert.match(
        out,
        /### axios \(1\.7\.0 → 1\.7\.9\)\n\nSources: \[repository\]\(https:\/\/github\.com\/axios\/axios\)\n\n_no changelog available_/,
    );
});

test("cross-project mode uses representative current and effectiveTarget", () => {
    const root = mkdtempSync(join(tmpdir(), "chrono-x-"));
    seedCache(root);
    const planPath = join(root, "cross-project-plan.json");
    const scansPath = join(root, "scan-by-project.json");
    writeFileSync(
        planPath,
        JSON.stringify({
            packages: [{ name: "zod", effectiveTarget: "3.24.1" }],
        }),
    );
    writeFileSync(
        scansPath,
        JSON.stringify({
            projA: {
                updates: [
                    {
                        name: "zod",
                        currentVersion: "3.23.0",
                        targetVersion: "3.24.1",
                    },
                ],
            },
            projB: {
                updates: [
                    {
                        name: "zod",
                        currentVersion: "3.23.0",
                        targetVersion: "3.24.0",
                    },
                ],
            },
        }),
    );
    const out = run([
        "--cross-project-plan",
        planPath,
        "--scan-by-project",
        scansPath,
        "--cache-dir",
        root,
    ]);
    assert.match(out, /### zod \(3\.23\.0 → 3\.24\.1\)/);
});

test("tampered cached body is not rendered", () => {
    const root = mkdtempSync(join(tmpdir(), "chrono-tamper-"));
    seedCache(root);
    const zod = packageCacheDir("zod", root);
    writeFileSync(join(zod, "3.24.1.md"), "## 3.24.1\n- tampered body");
    const scanPath = join(root, "scan.json");
    writeFileSync(
        scanPath,
        JSON.stringify({
            updates: [
                { name: "zod", currentVersion: "3.23.0", targetVersion: "3.24.1" },
            ],
        }),
    );
    const out = run(["--scan", scanPath, "--cache-dir", root]);
    assert.ok(!out.includes("tampered body"));
    assert.ok(!out.includes("<summary>3.24.1</summary>"));
    // intact sibling version still renders
    assert.match(out, /<summary>3\.23\.5<\/summary>/);
});

test("--out writes the section to a file", () => {
    const root = mkdtempSync(join(tmpdir(), "chrono-out-"));
    seedCache(root);
    const scanPath = join(root, "scan.json");
    writeFileSync(
        scanPath,
        JSON.stringify({
            updates: [
                { name: "zod", currentVersion: "3.23.0", targetVersion: "3.24.1" },
            ],
        }),
    );
    const outPath = join(root, "chronology.md");
    run(["--scan", scanPath, "--cache-dir", root, "--out", outPath]);
    const written = execFileSync("cat", [outPath], { encoding: "utf8" });
    assert.match(written, /^## Changelogs/);
});
