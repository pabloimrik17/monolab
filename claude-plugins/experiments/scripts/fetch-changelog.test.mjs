import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { parseArgs, resolveRange, runFetch, UsageError } from "./fetch-changelog.mjs";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "fetch-changelog.mjs");

const sha = (s) => createHash("sha256").update(s).digest("hex");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

/** Offline transport: exact-match routes, everything else 404. */
function makeHttp(routes) {
    const calls = [];
    const http = async (url) => {
        calls.push(url);
        for (const [match, res] of routes) {
            if (url === match) return res;
        }
        return { status: 404, body: "" };
    };
    return { http, calls };
}

const demoNpmView = () => ({
    repository: { url: "git+https://github.com/o/r.git" },
    versions: ["0.9.0", "1.0.0", "1.1.0", "2.0.0"],
});

const BRANCH_ROUTE = [
    "https://api.github.com/repos/o/r",
    { status: 200, body: JSON.stringify({ default_branch: "main" }) },
];

test("strategy A: raw changelog sections cached with SHA256; rerun is fully cache-served", async () => {
    const root = mkdtempSync(join(tmpdir(), "fetchlog-a-"));
    const changelog = [
        "## 1.1.0 (2025-01-02)",
        "- feature one-one",
        "",
        "## 1.0.0 (2025-01-01)",
        "- initial",
        "",
    ].join("\n");
    const routes = [
        BRANCH_ROUTE,
        [
            "https://raw.githubusercontent.com/o/r/main/CHANGELOG.md",
            { status: 200, body: changelog },
        ],
    ];
    const { http } = makeHttp(routes);
    const { result, exitCode } = await runFetch(["demo", "1.0.0..1.1.0", "--cache-dir", root], {
        http,
        npmView: demoNpmView,
        useGh: false,
    });

    expect(exitCode).toBe(0);
    expect(result.ok).toBe(true);
    expect(result.summary).toEqual({
        requested: 2,
        cached: 0,
        fetched: 2,
        failed: 0,
    });

    const dir = join(root, "demo");
    expect(result.cacheDir).toBe(dir);
    const body = readFileSync(join(dir, "1.1.0.md"), "utf8");
    expect(body).toContain("feature one-one");
    expect(body).not.toContain("initial"); // section split, not whole file
    const meta = readJson(join(dir, "1.1.0.meta.json"));
    expect(meta.status).toBe("verified");
    expect(meta.source).toBe("raw_changelog");
    expect(meta.sourceUrl).toBe("https://raw.githubusercontent.com/o/r/main/CHANGELOG.md");
    expect(meta.sha256).toBe(sha(body));
    expect(meta.byteSize).toBe(Buffer.byteLength(body));

    // raw-source snapshot + sha sidecar per the cache contract
    expect(readFileSync(join(dir, "_source", "CHANGELOG.md"), "utf8")).toBe(changelog);
    expect(readFileSync(join(dir, "_source", "CHANGELOG.md.sha256"), "utf8").trim()).toBe(
        sha(changelog),
    );
    const pkgMeta = readJson(join(dir, "_meta.json"));
    expect(pkgMeta.repository).toBe("o/r");
    expect(pkgMeta.changelogSource).toBe("raw_changelog");
    expect(pkgMeta.changelogFiles).toContain("CHANGELOG.md");

    // rerun against the same cache: zero network, both versions cached
    const second = makeHttp(routes);
    const rerun = await runFetch(["demo", "1.0.0..1.1.0", "--cache-dir", root], {
        http: second.http,
        npmView: demoNpmView,
        useGh: false,
    });
    expect(rerun.exitCode).toBe(0);
    expect(rerun.result.versions.map((v) => v.status)).toEqual(["cached", "cached"]);
    expect(second.calls).toEqual([]);
});

test("cascade: raw-changelog miss falls through to GitHub Releases; tagFormat learned", async () => {
    const root = mkdtempSync(join(tmpdir(), "fetchlog-b-"));
    const releaseUrl = "https://api.github.com/repos/o/r/releases/tags/v2.0.0";
    const { http, calls } = makeHttp([
        BRANCH_ROUTE,
        [
            releaseUrl,
            {
                status: 200,
                body: JSON.stringify({
                    body: "release notes for 2.0.0",
                    html_url: "https://github.com/o/r/releases/tag/v2.0.0",
                }),
            },
        ],
    ]);
    const { result, exitCode } = await runFetch(["demo", "2.0.0", "--cache-dir", root], {
        http,
        npmView: demoNpmView,
        useGh: false,
    });

    expect(exitCode).toBe(0);
    expect(result.versions).toEqual([
        expect.objectContaining({
            version: "2.0.0",
            status: "fetched",
            source: "github_releases",
        }),
    ]);
    // strategy order: raw CHANGELOG files probed BEFORE the release tag
    const rawIdx = calls.indexOf("https://raw.githubusercontent.com/o/r/main/CHANGELOG.md");
    expect(rawIdx).toBeGreaterThanOrEqual(0);
    expect(rawIdx).toBeLessThan(calls.indexOf(releaseUrl));

    const dir = join(root, "demo");
    expect(readFileSync(join(dir, "2.0.0.md"), "utf8")).toBe("release notes for 2.0.0");
    const meta = readJson(join(dir, "2.0.0.meta.json"));
    expect(meta.sha256).toBe(sha("release notes for 2.0.0"));
    expect(meta.sourceUrl).toBe("https://github.com/o/r/releases/tag/v2.0.0");
    // successful probe writes the learned tag format back to _meta.json
    expect(readJson(join(dir, "_meta.json")).tagFormat).toBe("v{version}");
});

test("per-version failure: structured no_changelog_source, run continues, exit 1; non-retryable not refetched", async () => {
    const root = mkdtempSync(join(tmpdir(), "fetchlog-fail-"));
    // CHANGELOG.md only covers 1.0.0; releases + unpkg 404 for 1.1.0
    const { http, calls } = makeHttp([
        BRANCH_ROUTE,
        [
            "https://raw.githubusercontent.com/o/r/main/CHANGELOG.md",
            { status: 200, body: "## 1.0.0 (2025-01-01)\n- initial\n" },
        ],
    ]);
    const { result, exitCode } = await runFetch(["demo", "1.0.0..1.1.0", "--cache-dir", root], {
        http,
        npmView: demoNpmView,
        useGh: false,
    });

    // exit classification 1: some versions failed, but the run finished
    expect(exitCode).toBe(1);
    expect(result.ok).toBe(false);
    expect(result.summary).toEqual({
        requested: 2,
        cached: 0,
        fetched: 1,
        failed: 1,
    });
    expect(result.versions).toEqual([
        expect.objectContaining({ version: "1.0.0", status: "fetched" }),
        expect.objectContaining({
            version: "1.1.0",
            status: "failed",
            source: null,
            failReason: "no_changelog_source",
            retryable: false,
        }),
    ]);
    // the whole cascade was exhausted for 1.1.0 before failing
    expect(calls).toContain("https://api.github.com/repos/o/r/releases/tags/v1.1.0");
    expect(calls).toContain("https://unpkg.com/demo@1.1.0/CHANGELOG.md");

    // structured error recorded on disk, no body file
    const dir = join(root, "demo");
    const failMeta = readJson(join(dir, "1.1.0.meta.json"));
    expect(failMeta.status).toBe("failed");
    expect(failMeta.failReason).toBe("no_changelog_source");
    expect(failMeta.retryable).toBe(false);
    expect(failMeta.sha256).toBeNull();
    expect(existsSync(join(dir, "1.1.0.md"))).toBe(false);

    // rerun: non-retryable failure is skipped (no refetch), still exit 1
    const second = makeHttp([]);
    const rerun = await runFetch(["demo", "1.0.0..1.1.0", "--cache-dir", root], {
        http: second.http,
        npmView: demoNpmView,
        useGh: false,
    });
    expect(rerun.exitCode).toBe(1);
    expect(rerun.result.versions.map((v) => v.status)).toEqual(["cached", "skipped"]);
    expect(second.calls).toEqual([]);
});

test("engine node: dist-index enumeration (stable only), single v{version} probe, no raw/cdn strategies", async () => {
    const root = mkdtempSync(join(tmpdir(), "fetchlog-node-"));
    const releaseUrl = "https://api.github.com/repos/nodejs/node/releases/tags/v23.1.0";
    const { http, calls } = makeHttp([
        [
            "https://nodejs.org/dist/index.json",
            {
                status: 200,
                body: JSON.stringify([
                    { version: "v24.0.0-rc.1" }, // prerelease → excluded
                    { version: "v23.1.0" },
                    { version: "v22.9.0" },
                ]),
            },
        ],
        [
            releaseUrl,
            {
                status: 200,
                body: JSON.stringify({
                    body: "node release notes",
                    html_url: "https://github.com/nodejs/node/releases/tag/v23.1.0",
                }),
            },
        ],
    ]);
    const npmViewForbidden = () => {
        throw new Error("npm view must not be called for the node engine");
    };
    const { result, exitCode } = await runFetch(["node", "latest", "--cache-dir", root], {
        http,
        npmView: npmViewForbidden,
        useGh: false,
    });

    expect(exitCode).toBe(0);
    expect(result.engine).toBe(true);
    // latest = max STABLE version from the dist index
    expect(result.from).toBe("23.1.0");
    expect(result.to).toBe("23.1.0");
    expect(result.versions).toEqual([
        expect.objectContaining({
            version: "23.1.0",
            status: "fetched",
            source: "github_releases",
        }),
    ]);
    // exactly: enumeration + one tag probe. No default-branch lookup, no
    // raw CHANGELOG cascade (strategy A skipped), no unpkg fallback.
    expect(calls).toEqual(["https://nodejs.org/dist/index.json", releaseUrl]);
    const dir = join(root, "node");
    expect(readFileSync(join(dir, "23.1.0.md"), "utf8")).toBe("node release notes");
    expect(readJson(join(dir, "23.1.0.meta.json")).sha256).toBe(sha("node release notes"));
});

test("engine pnpm (--engine): npm-registry enumeration, pnpm/pnpm repo, missing release → no_changelog_source", async () => {
    const root = mkdtempSync(join(tmpdir(), "fetchlog-pnpm-"));
    const npmViewCalls = [];
    const npmViewFake = (pkg, fields) => {
        npmViewCalls.push([pkg, fields]);
        return ["9.4.0", "9.5.0"];
    };
    const { http, calls } = makeHttp([]); // every request 404s
    const { result, exitCode } = await runFetch(
        ["pnpm", "9.5.0", "--engine", "--cache-dir", root],
        { http, npmView: npmViewFake, useGh: false },
    );

    expect(exitCode).toBe(1);
    expect(result.engine).toBe(true);
    // versions enumerated from the engine's npm package, not node-dist
    expect(npmViewCalls).toEqual([["pnpm", ["versions"]]]);
    // engine spec routes to pnpm/pnpm with the single v{version} template;
    // engine mode never falls back to unpkg
    expect(calls).toEqual(["https://api.github.com/repos/pnpm/pnpm/releases/tags/v9.5.0"]);
    expect(result.versions).toEqual([
        expect.objectContaining({
            version: "9.5.0",
            status: "failed",
            failReason: "no_changelog_source",
            retryable: false,
        }),
    ]);
    const failMeta = readJson(join(root, "pnpm", "9.5.0.meta.json"));
    expect(failMeta.status).toBe("failed");
    expect(failMeta.failReason).toBe("no_changelog_source");
});

test("structural errors: bad argv → CLI exit 2; bad range/version → UsageError; unwritable cache → non-usage throw", async () => {
    // real process exit code 2 + JSON error for bad argv (no network involved)
    let spawnErr = null;
    try {
        execFileSync(process.execPath, [SCRIPT, "only-one-arg"], {
            encoding: "utf8",
        });
    } catch (err) {
        spawnErr = err;
    }
    expect(spawnErr).not.toBeNull();
    expect(spawnErr.status).toBe(2);
    const cliJson = JSON.parse(spawnErr.stdout);
    expect(cliJson.ok).toBe(false);
    expect(cliJson.error).toMatch(/^usage:/);

    // inverted range and unknown version → UsageError (main maps to exit 2)
    const root = mkdtempSync(join(tmpdir(), "fetchlog-usage-"));
    const { http } = makeHttp([]);
    const deps = { http, npmView: demoNpmView, useGh: false };
    await expect(runFetch(["demo", "2.0.0..1.0.0", "--cache-dir", root], deps)).rejects.toThrow(
        UsageError,
    );
    await expect(runFetch(["demo", "3.3.3", "--cache-dir", root], deps)).rejects.toThrow(
        /version 3\.3\.3 not found/,
    );

    // unwritable cache root (path through a regular file) → structural
    // failure that is NOT a UsageError (main classifies as exit 2 too)
    writeFileSync(join(root, "blocker"), "");
    const err = await runFetch(
        ["demo", "2.0.0", "--cache-dir", join(root, "blocker", "nested")],
        deps,
    ).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(UsageError);
});

test("parseArgs merges split scoped names; resolveRange handles latest/singles", () => {
    expect(parseArgs(["@scope", "pkg", "1.0.0"]).pkg).toBe("@scope/pkg");
    expect(parseArgs(["demo", "1.0.0", "--engine"]).engine).toBe(true);
    expect(resolveRange("1.2.3", ["1.2.3"])).toEqual({
        from: "1.2.3",
        to: "1.2.3",
    });
    expect(resolveRange("latest", ["1.0.0", "1.5.0"])).toEqual({
        from: "1.5.0",
        to: "1.5.0",
    });
    // current behavior: `latest` picks the semver max of ALL valid versions,
    // prereleases included (despite the "no stable versions" error wording)
    expect(resolveRange("latest", ["1.5.0", "2.0.0-beta.1"])).toEqual({
        from: "2.0.0-beta.1",
        to: "2.0.0-beta.1",
    });
    expect(resolveRange("not-a-version", ["1.0.0"]).error).toMatch(/invalid/);
});
