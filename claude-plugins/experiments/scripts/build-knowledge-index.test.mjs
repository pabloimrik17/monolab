import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "vitest";
import { buildKnowledgeIndex, parseRangeHeading } from "./build-knowledge-index.mjs";
import { copyRunKnowledge } from "./copy-run-knowledge.mjs";
import { verifyPreimage } from "./lib/knowledge.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, "fixtures", "knowledge");
const SCRIPT = join(HERE, "build-knowledge-index.mjs");

function cloneFixture(name) {
    const dest = join(mkdtempSync(join(tmpdir(), "index-run-")), name);
    cpSync(join(FIXTURES, name), dest, { recursive: true });
    return dest;
}

function tempRoot() {
    return join(mkdtempSync(join(tmpdir(), "index-vault-")), "vault");
}

const CROSS_OUTCOME = {
    runId: "commander-deep-minor-minor-1784387463",
    level: "minor",
    mode: "cross-project",
    gateOption: "apply-all",
    projects: [
        {
            projectName: "dotfiles",
            mechanism: "apply-npm-updates",
            bumps: {
                appliedGeneric: [
                    "@commitlint/cli",
                    "@commitlint/config-conventional",
                    "@commitlint/types",
                ],
                appliedOverrides: [],
                installRan: true,
                logPath: "logs/apply-dotfiles.log",
                failure: null,
            },
            changeset: {
                status: "approved",
                path: "changesets/dotfiles/changeset.md",
                applicable: 0,
                inapplicable: 12,
            },
        },
        {
            projectName: "monolab",
            mechanism: "apply-npm-updates",
            bumps: {
                appliedGeneric: [
                    "@commitlint/cli",
                    "@commitlint/config-conventional",
                    "@commitlint/types",
                    "@nx/js",
                ],
                appliedOverrides: [],
                installRan: true,
                logPath: "logs/apply-monolab.log",
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
};

const SOLO_OUTCOME = {
    runId: "dryrun-alpha-minor-1783854242",
    level: "minor",
    mode: "single-project",
    gateOption: "apply-all",
    projects: [
        {
            projectName: "dryrun-alpha",
            mechanism: "apply-npm-updates",
            bumps: {
                appliedGeneric: ["chalk", "lodash", "semver", "zod"],
                appliedOverrides: [],
                installRan: true,
                logPath: "logs/apply.log",
                failure: null,
            },
            changeset: {
                status: "approved",
                path: "changesets/changeset.md",
                applicable: 1,
                inapplicable: 4,
            },
        },
    ],
};

function seedBothFixtures(root) {
    copyRunKnowledge({
        runDir: cloneFixture("commander-deep-minor-minor-1784387463"),
        outcome: CROSS_OUTCOME,
        root,
    });
    copyRunKnowledge({
        runDir: cloneFixture("dryrun-alpha-minor-1783854242"),
        outcome: SOLO_OUTCOME,
        root,
    });
}

test("buildKnowledgeIndex matches the golden index built from both fixtures", () => {
    const root = tempRoot();
    seedBothFixtures(root);
    const index = buildKnowledgeIndex(root);
    const golden = JSON.parse(readFileSync(join(FIXTURES, "golden-index.json"), "utf8"));
    assert.equal(index.root, root); // machine-specific; not pinned in the golden fixture
    const { root: _omit, ...rest } = index;
    assert.deepEqual(rest, golden);
    const onDisk = JSON.parse(readFileSync(join(root, "index.json"), "utf8"));
    assert.equal(onDisk.root, root);
    const { root: _omit2, ...restOnDisk } = onDisk;
    assert.deepEqual(restOnDisk, golden);
});

test("buildKnowledgeIndex resolves the root itself via resolveKnowledgeRoot when called with none", () => {
    const root = tempRoot();
    seedBothFixtures(root);
    const prevEnv = process.env.KNOWLEDGE_ROOT;
    process.env.KNOWLEDGE_ROOT = root;
    try {
        const index = buildKnowledgeIndex();
        assert.equal(index.root, root);
    } finally {
        if (prevEnv === undefined) delete process.env.KNOWLEDGE_ROOT;
        else process.env.KNOWLEDGE_ROOT = prevEnv;
    }
});

test("the index survives deletion: a rebuild restores it from notes and hubs alone", () => {
    const root = tempRoot();
    seedBothFixtures(root);
    const before = buildKnowledgeIndex(root);
    rmSync(join(root, "index.json"));
    const after = buildKnowledgeIndex(root);
    assert.deepEqual(after, before);
});

test("buildKnowledgeIndex throws for a missing root", () => {
    const root = join(mkdtempSync(join(tmpdir(), "index-absent-root-")), "vault");
    assert.throws(() => buildKnowledgeIndex(root));
});

test("CLI: --root without a directory returns a usage error before writing", () => {
    const defaultRoot = join(mkdtempSync(join(tmpdir(), "index-missing-root-")), "vault");
    const result = spawnSync(process.execPath, [SCRIPT, "--root"], {
        encoding: "utf8",
        env: { ...process.env, KNOWLEDGE_ROOT: defaultRoot },
    });

    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "build-knowledge-index: --root requires a directory\n");
    assert.equal(existsSync(defaultRoot), false);
});

test.each([
    ["Unicode", "## 1.0.0 → 1.1.0"],
    ["ASCII", "## 1.0.0 -> 1.1.0"],
])("parseRangeHeading accepts the %s separator", (_separator, heading) => {
    assert.deepEqual(parseRangeHeading(heading), { from: "1.0.0", to: "1.1.0" });
});

test("parseRangeHeading rejects a long malformed heading", () => {
    assert.equal(parseRangeHeading(`## ${" ".repeat(100_000)}`), null);
});

test.each([
    ["later", "2026-08-01T00:00:00Z", true],
    ["earlier", "2026-07-01T00:00:00Z", false],
    ["equally dated", "2026-07-18T15:11:03Z", false],
])("supersededBy: %s covering run respects chronology", (_timing, createdAt, supersedes) => {
    const root = tempRoot();
    seedBothFixtures(root);

    const runDir = cloneFixture("commander-deep-minor-minor-1784387463");
    const metaPath = join(runDir, "_meta.json");
    const meta = JSON.parse(readFileSync(metaPath, "utf8"));
    meta.planDirName = "commander-deep-minor-minor-1790000000";
    meta.createdAt = createdAt;
    writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    const groupMetaPath = join(runDir, "groups", "nx-1", "_meta.json");
    const groupMeta = JSON.parse(readFileSync(groupMetaPath, "utf8"));
    groupMeta.packages[0].from = "23.0.0";
    groupMeta.packages[0].to = "23.2.0";
    writeFileSync(groupMetaPath, JSON.stringify(groupMeta, null, 2));
    const researchPath = join(runDir, "groups", "nx-1", "research.md");
    writeFileSync(
        researchPath,
        readFileSync(researchPath, "utf8").replace("(23.0.2 → 23.1.0)", "(23.0.0 → 23.2.0)"),
    );

    const coveringOutcome = {
        ...CROSS_OUTCOME,
        runId: meta.planDirName,
        projects: CROSS_OUTCOME.projects.map((p) => ({ ...p })),
    };
    copyRunKnowledge({ runDir, outcome: coveringOutcome, root });

    const index = buildKnowledgeIndex(root);
    const nxHub = index.packages.find((p) => p.name === "@nx/js");
    const covered = nxHub.ranges.find((r) => r.to === "23.1.0");
    const covering = nxHub.ranges.find((r) => r.to === "23.2.0");
    assert.equal(covered.supersededBy, supersedes ? covering.runId : null);
    assert.equal(covering.supersededBy, null);

    const hubContent = readFileSync(join(root, "packages", "@nx__js.md"), "utf8");
    const supersededMarker = new RegExp(`supersededBy:${covering.runId}`);
    if (supersedes) assert.match(hubContent, supersededMarker);
    else assert.doesNotMatch(hubContent, supersededMarker);
    assert.match(hubContent, /## 23\.0\.2 → 23\.1\.0/);
    // The marker is script-owned content outside every slot, so the rewrite has
    // to restamp the pre-image hash the validator checks; without it the next
    // `check-knowledge-note.mjs` run reads this as a model edit.
    assert.deepEqual(verifyPreimage(hubContent), { ok: true, reason: null });
});

test("a draft-status run note is recorded as draft in the index", () => {
    const root = tempRoot();
    seedBothFixtures(root);
    const notePath = join(root, "runs", "dryrun-alpha-minor-1783854242.md");
    writeFileSync(notePath, readFileSync(notePath, "utf8").replace("status: ok", "status: draft"));

    const index = buildKnowledgeIndex(root);
    const run = index.runs.find((r) => r.runId === "dryrun-alpha-minor-1783854242");
    assert.equal(run.status, "draft");
    const zodRange = index.packages.find((p) => p.name === "zod").ranges[0];
    assert.equal(zodRange.status, "draft");
});
