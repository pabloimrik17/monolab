import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "vitest";
import { copyRunKnowledge } from "./copy-run-knowledge.mjs";
import { matchKnowledge, recallAgainstRoot } from "./match-knowledge.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, "fixtures", "knowledge");

function nxRange(overrides = {}) {
    return {
        from: "23.0.2",
        to: "23.1.0",
        anchor: "23.0.2 → 23.1.0",
        runId: "run-a",
        notePath: "runs/run-a.md",
        level: "minor",
        mode: "cross-project",
        createdAt: "2026-07-18T00:00:00Z",
        status: "ok",
        groupId: "nx-1",
        bucketKey: "nx",
        synthetic: false,
        supersededBy: null,
        ...overrides,
    };
}

function indexWith(ranges) {
    return {
        runs: [],
        packages: [{ name: "@nx/js", hubPath: "packages/@nx__js.md", latest: "23.1.0", ranges }],
    };
}

function groupsWith(pkgs) {
    return { groups: [{ groupId: "nx-1", bucketKey: "nx", packages: pkgs }] };
}

test("exact: identical range hits, delta null", () => {
    const index = indexWith([nxRange()]);
    const groups = groupsWith([{ name: "@nx/js", from: "23.0.2", to: "23.1.0" }]);
    const { hits, summary } = matchKnowledge(index, groups);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].class, "exact");
    assert.equal(hits[0].delta, null);
    assert.equal(hits[0].priorFrom, "23.0.2");
    assert.equal(hits[0].priorTo, "23.1.0");
    assert.equal(hits[0].hubPath, "packages/@nx__js.md");
    assert.deepEqual(summary, { exact: 1, overlap: 0, prior: 0, related: 0, packages: 1 });
});

test("prior: disjoint earlier range offers applicability only, via paths", () => {
    const index = indexWith([nxRange()]);
    const groups = groupsWith([{ name: "@nx/js", from: "23.1.0", to: "23.2.0" }]);
    const { hits } = matchKnowledge(index, groups);
    assert.equal(hits[0].class, "prior");
    assert.equal(hits[0].delta, null);
});

test("overlap: intersecting range carries the correct delta", () => {
    const index = indexWith([nxRange()]);
    const groups = groupsWith([{ name: "@nx/js", from: "23.0.5", to: "23.3.0" }]);
    const { hits } = matchKnowledge(index, groups);
    assert.equal(hits[0].class, "overlap");
    assert.equal(hits[0].delta, "(23.1.0, 23.3.0]");
});

test("bucketKey: the group record's own value wins over the groupId-derived fallback", () => {
    // Bucket name ending in digits would derive wrong ("nx-2" -> "nx-" vs
    // the real "nx"); the explicit group record must win when present.
    const index = indexWith([nxRange()]);
    const groups = {
        groups: [
            {
                groupId: "nx-2-1",
                bucketKey: "nx-2",
                packages: [
                    { name: "@nx/js", from: "23.0.2", to: "23.1.0" },
                    { name: "@nx/workspace", from: "20.0.0", to: "20.1.0" },
                ],
            },
        ],
    };
    const nxHubWithBucket = { ...index.packages[0], ranges: [nxRange({ bucketKey: "nx-2" })] };
    const result = matchKnowledge({ packages: [nxHubWithBucket] }, groups);
    assert.equal(result.related.length, 1);
    assert.equal(result.related[0].bucketKey, "nx-2");
});

test("bucketKey: derives from groupId only when the group record omits it", () => {
    const index = indexWith([nxRange()]);
    const groups = {
        groups: [
            {
                groupId: "nx-1",
                packages: [
                    { name: "@nx/js", from: "23.0.2", to: "23.1.0" },
                    { name: "@nx/workspace", from: "20.0.0", to: "20.1.0" },
                ],
            },
        ],
    };
    const { related } = matchKnowledge(index, groups);
    assert.equal(related.length, 1);
    assert.equal(related[0].bucketKey, "nx");
});

test("related: a sibling in the same bucketKey with no same-name hit surfaces as context only", () => {
    const index = indexWith([nxRange()]);
    const groups = groupsWith([
        { name: "@nx/js", from: "23.0.2", to: "23.1.0" },
        { name: "@nx/workspace", from: "20.0.0", to: "20.1.0" },
    ]);
    const { hits, related, summary } = matchKnowledge(index, groups);
    assert.equal(hits.length, 1);
    assert.equal(related.length, 1);
    assert.deepEqual(related[0], {
        name: "@nx/workspace",
        groupId: "nx-1",
        bucketKey: "nx",
        hubs: ["packages/@nx__js.md"],
    });
    assert.deepEqual(summary, { exact: 1, overlap: 0, prior: 0, related: 1, packages: 2 });
});

test("synthetic: a synthetic-tagged range is never a hit, nor a sibling hub for related", () => {
    const index = indexWith([nxRange({ synthetic: true })]);
    const groups = groupsWith([
        { name: "@nx/js", from: "23.0.2", to: "23.1.0" },
        { name: "@nx/workspace", from: "20.0.0", to: "20.1.0" },
    ]);
    const { hits, related } = matchKnowledge(index, groups);
    assert.equal(hits.length, 0);
    assert.equal(related.length, 0);
});

test("draft: status draft is never a hit, nor a sibling hub for related", () => {
    const index = indexWith([nxRange({ status: "draft" })]);
    const groups = groupsWith([
        { name: "@nx/js", from: "23.0.2", to: "23.1.0" },
        { name: "@nx/workspace", from: "20.0.0", to: "20.1.0" },
    ]);
    const { hits, related } = matchKnowledge(index, groups);
    assert.equal(hits.length, 0);
    assert.equal(related.length, 0);
});

test("age never filters: the oldest exact candidate is still emitted", () => {
    const index = indexWith([nxRange({ createdAt: "2020-01-01T00:00:00Z" })]);
    const groups = groupsWith([{ name: "@nx/js", from: "23.0.2", to: "23.1.0" }]);
    const { hits } = matchKnowledge(index, groups);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].class, "exact");
});

test("age breaks a tie between two candidates of the same class", () => {
    const index = indexWith([
        nxRange({ runId: "run-old", createdAt: "2020-01-01T00:00:00Z" }),
        nxRange({ runId: "run-new", createdAt: "2026-01-01T00:00:00Z" }),
    ]);
    const groups = groupsWith([{ name: "@nx/js", from: "23.0.2", to: "23.1.0" }]);
    const { hits } = matchKnowledge(index, groups);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].runId, "run-new");
});

test("class preference: exact beats a newer prior candidate", () => {
    const index = indexWith([
        nxRange({
            runId: "run-exact",
            from: "23.0.2",
            to: "23.1.0",
            createdAt: "2020-01-01T00:00:00Z",
        }),
        nxRange({
            runId: "run-prior",
            from: "22.0.0",
            to: "23.0.2",
            createdAt: "2026-01-01T00:00:00Z",
        }),
    ]);
    const groups = groupsWith([{ name: "@nx/js", from: "23.0.2", to: "23.1.0" }]);
    const { hits } = matchKnowledge(index, groups);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].class, "exact");
    assert.equal(hits[0].runId, "run-exact");
});

test("no candidate and no related bucket sibling: package is neither a hit nor related", () => {
    const index = indexWith([]);
    const groups = {
        groups: [
            {
                groupId: "left-pad-1",
                bucketKey: "left-pad",
                packages: [{ name: "left-pad", from: "1.0.0", to: "1.3.0" }],
            },
        ],
    };
    const { hits, related, summary } = matchKnowledge(index, groups);
    assert.equal(hits.length, 0);
    assert.equal(related.length, 0);
    assert.equal(summary.packages, 1);
});

test("recallAgainstRoot: no-op with the absent-base shape when the root does not exist", () => {
    const root = join(mkdtempSync(join(tmpdir(), "match-absent-root-")), "vault");
    const result = recallAgainstRoot(
        root,
        groupsWith([{ name: "@nx/js", from: "1.0.0", to: "1.0.1" }]),
    );
    assert.deepEqual(result, {
        root,
        baseAbsent: true,
        hits: [],
        related: [],
        summary: { exact: 0, overlap: 0, prior: 0, related: 0, packages: 1 },
    });
});

test("recallAgainstRoot: a base that exists but cannot be rebuilt is not an absent base", () => {
    const root = join(mkdtempSync(join(tmpdir(), "broken-vault-")), "vault");
    mkdirSync(join(root, "runs"), { recursive: true });
    writeFileSync(join(root, "index.json"), "{}\n");
    // The base is plainly there, and just as plainly unreadable: `packages`
    // is a file where the rebuild will try to list a directory.
    writeFileSync(join(root, "packages"), "not a directory\n");

    const result = recallAgainstRoot(
        root,
        groupsWith([{ name: "@nx/js", from: "1.0.0", to: "1.0.1" }]),
    );
    assert.equal(result.baseAbsent, false);
    assert.ok(result.error, "the reason reaches the caller for the `recall failed` digest");
    assert.deepEqual(result.hits, []);
    assert.deepEqual(result.related, []);
});

test("recallAgainstRoot: resolves the root itself when omitted, absent-base shape names it", () => {
    const prevEnv = process.env.KNOWLEDGE_ROOT;
    const root = join(mkdtempSync(join(tmpdir(), "match-env-absent-root-")), "vault");
    process.env.KNOWLEDGE_ROOT = root;
    try {
        const result = recallAgainstRoot(
            undefined,
            groupsWith([{ name: "@nx/js", from: "1.0.0", to: "1.0.1" }]),
        );
        assert.equal(result.root, root);
        assert.equal(result.baseAbsent, true);
    } finally {
        if (prevEnv === undefined) delete process.env.KNOWLEDGE_ROOT;
        else process.env.KNOWLEDGE_ROOT = prevEnv;
    }
});

test("recallAgainstRoot: rebuilds a missing index before matching a persisted vault", () => {
    const dest = join(
        mkdtempSync(join(tmpdir(), "match-run-")),
        "commander-deep-minor-minor-1784387463",
    );
    cpSync(join(FIXTURES, "commander-deep-minor-minor-1784387463"), dest, { recursive: true });
    const root = join(mkdtempSync(join(tmpdir(), "match-vault-")), "vault");
    copyRunKnowledge({
        runDir: dest,
        outcome: {
            runId: "commander-deep-minor-minor-1784387463",
            level: "minor",
            mode: "cross-project",
            gateOption: "apply-all",
            projects: [
                {
                    projectName: "monolab",
                    mechanism: "apply-npm-updates",
                    bumps: {
                        appliedGeneric: ["@nx/js"],
                        appliedOverrides: [],
                        installRan: true,
                        logPath: null,
                        failure: null,
                    },
                    changeset: {
                        status: "approved",
                        path: "changesets/monolab/changeset.md",
                        applicable: 1,
                        inapplicable: 55,
                    },
                },
            ],
        },
        root,
    });
    const indexPath = join(root, "index.json");
    rmSync(indexPath);
    assert.equal(existsSync(indexPath), false);

    const groups = groupsWith([{ name: "@nx/js", from: "23.0.2", to: "23.1.0" }]);
    const result = recallAgainstRoot(root, groups);
    assert.equal(existsSync(indexPath), true);
    assert.equal(result.root, root);
    assert.equal(result.baseAbsent, false);
    assert.equal(result.hits.length, 1);
    assert.equal(result.hits[0].class, "exact");
    assert.equal(result.hits[0].hubPath, "packages/@nx__js.md");

    // A scanned version the comparer cannot read — `catalog:`, a dist-tag, a
    // workspace protocol — must cost that one package its hit and nothing
    // more. Throwing through would turn a recall that had answers into
    // `recall failed` and lose every sibling's hit with it.
    const mixed = groupsWith([
        { name: "@commitlint/cli", from: "catalog:", to: "21.2.1" },
        { name: "@nx/js", from: "23.0.2", to: "23.1.0" },
    ]);
    const survived = recallAgainstRoot(root, mixed);
    assert.equal(survived.hits.length, 1);
    assert.equal(survived.hits[0].name, "@nx/js");
    assert.equal(survived.summary.packages, 2);
});

test("CLI: --groups - reads the groups object from stdin", () => {
    const dest = join(
        mkdtempSync(join(tmpdir(), "match-run-")),
        "commander-deep-minor-minor-1784387463",
    );
    cpSync(join(FIXTURES, "commander-deep-minor-minor-1784387463"), dest, { recursive: true });
    const root = join(mkdtempSync(join(tmpdir(), "match-vault-")), "vault");
    copyRunKnowledge({
        runDir: dest,
        outcome: {
            runId: "commander-deep-minor-minor-1784387463",
            level: "minor",
            mode: "cross-project",
            gateOption: "apply-all",
            projects: [
                {
                    projectName: "monolab",
                    mechanism: "apply-npm-updates",
                    bumps: {
                        appliedGeneric: ["@nx/js"],
                        appliedOverrides: [],
                        installRan: true,
                        logPath: null,
                        failure: null,
                    },
                    changeset: {
                        status: "approved",
                        path: "changesets/monolab/changeset.md",
                        applicable: 1,
                        inapplicable: 55,
                    },
                },
            ],
        },
        root,
    });
    const scriptPath = join(HERE, "match-knowledge.mjs");
    const out = execFileSync(process.execPath, [scriptPath, "--root", root, "--groups", "-"], {
        input: JSON.stringify(groupsWith([{ name: "@nx/js", from: "23.0.2", to: "23.1.0" }])),
        encoding: "utf8",
    });
    const result = JSON.parse(out);
    assert.equal(result.hits.length, 1);
    assert.equal(result.hits[0].class, "exact");
});
