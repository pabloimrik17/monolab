import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "vitest";
import { computeRunOutcome, copyRunKnowledge, reconstructOutcome } from "./copy-run-knowledge.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, "fixtures", "knowledge");

function cloneFixture(name) {
    const dest = join(mkdtempSync(join(tmpdir(), "knowledge-run-")), name);
    cpSync(join(FIXTURES, name), dest, { recursive: true });
    return dest;
}

function tempRoot() {
    return join(mkdtempSync(join(tmpdir(), "knowledge-vault-")), "vault");
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

test("computeRunOutcome: applied, partial, failed, empty", () => {
    assert.equal(
        computeRunOutcome({
            projects: [{ bumps: { failure: null } }, { bumps: { failure: null } }],
        }),
        "applied",
    );
    assert.equal(
        computeRunOutcome({ projects: [{ bumps: { resolvedTargets: {}, applied: [] } }] }),
        "applied",
    );
    assert.equal(
        computeRunOutcome({
            projects: [{ bumps: { failure: null } }, { bumps: { failure: "boom" } }],
        }),
        "partial",
    );
    assert.equal(computeRunOutcome({ projects: [{ bumps: { failure: "boom" } }] }), "failed");
    assert.equal(computeRunOutcome({ projects: [] }), "empty");
});

test("copyRunKnowledge: an empty outcome.projects[] is refused, nothing written", () => {
    const runDir = cloneFixture("dryrun-alpha-minor-1783854242");
    const root = tempRoot();
    const result = copyRunKnowledge({
        runDir,
        outcome: {
            runId: "dryrun-alpha-minor-1783854242",
            level: "minor",
            mode: "single-project",
            gateOption: "apply-all",
            projects: [],
        },
        root,
    });
    assert.equal(result.failed, true);
    assert.ok(!existsSync(root));
});

test("copyRunKnowledge: failed run persists nothing under the root", () => {
    const runDir = cloneFixture("commander-deep-minor-minor-1784387463");
    const root = tempRoot();
    const failedOutcome = {
        ...CROSS_OUTCOME,
        projects: CROSS_OUTCOME.projects.map((p) => ({
            ...p,
            bumps: { ...p.bumps, failure: "install failed" },
        })),
    };
    const result = copyRunKnowledge({ runDir, outcome: failedOutcome, root });
    assert.equal(result.failed, true);
    assert.ok(!existsSync(root));
});

test("copyRunKnowledge: cross-project run bootstraps the vault and copies the allowlist", () => {
    const runDir = cloneFixture("commander-deep-minor-minor-1784387463");
    const root = tempRoot();
    const result = copyRunKnowledge({ runDir, outcome: CROSS_OUTCOME, root });

    assert.equal(result.runId, "commander-deep-minor-minor-1784387463");
    assert.equal(result.root, root);
    assert.equal(result.notePath, "runs/commander-deep-minor-minor-1784387463.md");
    assert.equal(result.packages, 4);
    assert.deepEqual(
        result.hubs.sort(),
        [
            "packages/@commitlint__cli.md",
            "packages/@commitlint__config-conventional.md",
            "packages/@commitlint__types.md",
            "packages/@nx__js.md",
        ].sort(),
    );
    assert.equal(result.distill, 0); // cross-project research is universal-only, never legacy

    assert.ok(existsSync(join(root, "runs")));
    assert.ok(existsSync(join(root, "packages")));
    assert.equal(readFileSync(join(root, ".obsidian", "app.json"), "utf8").trim(), "{}");
    assert.ok(existsSync(join(root, "Runs.base")));
    assert.ok(existsSync(join(root, "Packages.base")));
    assert.ok(existsSync(join(root, "index.json")));

    const rawDir = join(root, "runs", "commander-deep-minor-minor-1784387463");
    assert.ok(existsSync(join(rawDir, "dossier.md")));
    assert.ok(existsSync(join(rawDir, "_meta.json")));
    assert.ok(existsSync(join(rawDir, "outcome.json")));
    assert.ok(existsSync(join(rawDir, "groups", "nx-1", "research.md")));
    assert.ok(existsSync(join(rawDir, "changesets", "dotfiles", "changeset.md")));
    assert.ok(existsSync(join(rawDir, "changesets", "monolab", "changeset.md")));
    assert.ok(!existsSync(join(rawDir, "changelogs")));
    assert.ok(!existsSync(join(rawDir, "logs")));
    assert.ok(!existsSync(join(rawDir, "chronology.md")));

    const stamped = JSON.parse(readFileSync(join(runDir, "outcome.json"), "utf8"));
    assert.ok(stamped.recordedAt);

    const nxHub = readFileSync(join(root, "packages", "@nx__js.md"), "utf8");
    assert.match(nxHub, /type: package/);
    assert.match(nxHub, /name: "@nx\/js"/);
    assert.match(nxHub, /## 23\.0\.2 → 23\.1\.0/);
    assert.match(
        nxHub,
        /<!-- run:commander-deep-minor-minor-1784387463 level:minor mode:cross-project synthetic:false supersededBy: -->/,
    );
    assert.ok(!nxHub.includes("<!-- distill -->"));
    assert.ok(nxHub.includes("bumped to 0.8.1")); // script-copied universal content

    const runNote = readFileSync(
        join(root, "runs", "commander-deep-minor-minor-1784387463.md"),
        "utf8",
    );
    assert.match(runNote, /outcome: applied/);
    assert.match(runNote, /mode: cross-project/);
    assert.match(runNote, /projects: \[dotfiles, monolab\]/);
});

test("copyRunKnowledge: re-persisting the same run replaces sections in place", () => {
    const runDir = cloneFixture("commander-deep-minor-minor-1784387463");
    const root = tempRoot();
    copyRunKnowledge({ runDir, outcome: CROSS_OUTCOME, root });
    copyRunKnowledge({ runDir, outcome: CROSS_OUTCOME, root });

    const nxHub = readFileSync(join(root, "packages", "@nx__js.md"), "utf8");
    const headingCount = (nxHub.match(/^## 23\.0\.2 → 23\.1\.0$/gm) ?? []).length;
    assert.equal(headingCount, 1);

    const runsDir = join(root, "runs");
    assert.deepEqual(
        readFileSync(join(runsDir, "commander-deep-minor-minor-1784387463.md"), "utf8").match(
            /^# Run /gm,
        )?.length,
        1,
    );
});

test("copyRunKnowledge: a new range for an already-hubbed package appends a section", () => {
    const runDir = cloneFixture("commander-deep-minor-minor-1784387463");
    const root = tempRoot();
    copyRunKnowledge({ runDir, outcome: CROSS_OUTCOME, root });

    const laterOutcome = {
        ...CROSS_OUTCOME,
        runId: "commander-deep-minor-minor-1790000000",
        projects: CROSS_OUTCOME.projects.map((p) => ({ ...p })),
    };
    const metaPath = join(runDir, "groups", "nx-1", "_meta.json");
    const meta = JSON.parse(readFileSync(metaPath, "utf8"));
    meta.packages[0].from = "23.1.0";
    meta.packages[0].to = "23.2.0";
    writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    const researchPath = join(runDir, "groups", "nx-1", "research.md");
    writeFileSync(
        researchPath,
        readFileSync(researchPath, "utf8").replace("(23.0.2 → 23.1.0)", "(23.1.0 → 23.2.0)"),
    );
    const rootMetaPath = join(runDir, "_meta.json");
    const rootMeta = JSON.parse(readFileSync(rootMetaPath, "utf8"));
    rootMeta.planDirName = laterOutcome.runId;
    writeFileSync(rootMetaPath, JSON.stringify(rootMeta, null, 2));

    copyRunKnowledge({ runDir, outcome: laterOutcome, root });

    const nxHub = readFileSync(join(root, "packages", "@nx__js.md"), "utf8");
    assert.match(nxHub, /## 23\.0\.2 → 23\.1\.0/);
    assert.match(nxHub, /## 23\.1\.0 → 23\.2\.0/);
    assert.match(nxHub, /ranges: \["21\.1\.0\.\.21\.2\.1"\]|ranges: /); // sanity: ranges list present
    assert.match(nxHub, /latest: 23\.2\.0/);
});

test("copyRunKnowledge: legacy single-project research is marked for distillation", () => {
    const runDir = cloneFixture("dryrun-alpha-minor-1783854242");
    const root = tempRoot();
    const outcome = {
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
    const result = copyRunKnowledge({ runDir, outcome, root });
    assert.equal(result.distill, 4);

    const zodHub = readFileSync(join(root, "packages", "zod.md"), "utf8");
    assert.match(zodHub, /<!-- distill -->/);

    const runNote = readFileSync(join(root, "runs", "dryrun-alpha-minor-1783854242.md"), "utf8");
    assert.match(runNote, /tags: \[run, minor, single-project, distilled\]/);
    assert.match(runNote, /distilled: true/);
});

test("copyRunKnowledge: a group with no research.md is not a distillation", () => {
    const runDir = cloneFixture("commander-deep-minor-minor-1784387463");
    rmSync(join(runDir, "groups", "nx-1", "research.md"));
    const root = tempRoot();

    const result = copyRunKnowledge({ runDir, outcome: CROSS_OUTCOME, root });
    assert.equal(result.distill, 0);
    assert.equal(result.noResearch, 1);

    const nxHub = readFileSync(join(root, "packages", "@nx__js.md"), "utf8");
    assert.match(nxHub, /<!-- no-research -->/);
    assert.ok(!nxHub.includes("<!-- distill -->"));

    const runNote = readFileSync(
        join(root, "runs", "commander-deep-minor-minor-1784387463.md"),
        "utf8",
    );
    assert.ok(!runNote.includes("distilled"));
});

test("copyRunKnowledge: the hub's Applied section carries entry titles, not their fields", () => {
    const runDir = cloneFixture("commander-deep-minor-minor-1784387463");
    // The fixture's one Applicable entry names a package outside its groups;
    // point it at a package the run actually carries so a hub records it.
    const changesetPath = join(runDir, "changesets", "monolab", "changeset.md");
    writeFileSync(
        changesetPath,
        readFileSync(changesetPath, "utf8")
            .replace("### eslint — ", "### @nx/js — ")
            .replace(
                "- **File**: /workspace/monolab.deps-minor-2026-07-18/eslint.config.ts",
                "- **File**: /Users/someone/elsewhere/libs/@nx/js/tsconfig.json",
            ),
    );
    const root = tempRoot();
    copyRunKnowledge({ runDir, outcome: CROSS_OUTCOME, root });
    const applied = readFileSync(join(root, "packages", "@nx__js.md"), "utf8").split(
        "### Applied",
    )[1];

    // The whole `### <pkg> — <what changed>` heading is the title, and it is
    // the only one: an entry's own `- **File**: …` line is a field of that
    // entry, not a second entry — mining it appended junk and leaked another
    // machine's absolute paths into the hub.
    assert.match(
        applied,
        /^- applicable: @nx\/js — no-constant-binary-expression gains a checkRelationalComparisons option$/m,
    );
    assert.doesNotMatch(applied, /\/Users\/someone/);
});

test("copyRunKnowledge: changeset titles match the exact package name", () => {
    const runDir = cloneFixture("dryrun-alpha-minor-1783854242");
    const changesetPath = join(runDir, "changesets", "changeset.md");
    writeFileSync(
        changesetPath,
        readFileSync(changesetPath, "utf8")
            .replace("### [medium] zod —", "### [medium] zod-extra —")
            .replace("- **[low] zod —", "- **[low] zod-extra —"),
    );
    const root = tempRoot();
    copyRunKnowledge({ runDir, root });

    const applied = readFileSync(join(root, "packages", "zod.md"), "utf8").split("### Applied")[1];
    assert.match(applied, /_no findings_/);
    assert.doesNotMatch(applied, /zod-extra/);
});

test("copyRunKnowledge: a bullet-listed changeset section keeps one title per bullet", () => {
    const runDir = cloneFixture("commander-deep-minor-minor-1784387463");
    const root = tempRoot();
    copyRunKnowledge({ runDir, outcome: CROSS_OUTCOME, root });
    const applied = readFileSync(join(root, "packages", "@commitlint__cli.md"), "utf8").split(
        "### Applied",
    )[1];
    assert.match(applied, /applicable: none/);
    assert.match(applied, /inapplicable: 1 title\(s\)/);
});

test("copyRunKnowledge: a run's own outcome.json survives a re-persist that passes none", () => {
    const runDir = cloneFixture("commander-deep-minor-minor-1784387463");
    const root = tempRoot();
    copyRunKnowledge({ runDir, outcome: CROSS_OUTCOME, root });
    // Re-persist the way /experiments:knowledge-persist does: no outcome passed.
    copyRunKnowledge({ runDir, root });

    const onDisk = JSON.parse(readFileSync(join(runDir, "outcome.json"), "utf8"));
    assert.equal(
        onDisk.gateOption,
        "apply-all",
        "the gate option is not recoverable once overwritten",
    );
    assert.ok(
        onDisk.projects.every((p) => p.mechanism !== "reconstructed"),
        "reconstruction must not overwrite a real apply record",
    );

    const runNote = readFileSync(
        join(root, "runs", "commander-deep-minor-minor-1784387463.md"),
        "utf8",
    );
    assert.match(runNote, /^outcome: applied$/m);
    assert.match(runNote, /^source: run-dir$/m);
});

test("copyRunKnowledge: Applicable (0) run is still persisted", () => {
    const runDir = cloneFixture("commander-deep-minor-minor-1784387463");
    const root = tempRoot();
    copyRunKnowledge({ runDir, outcome: CROSS_OUTCOME, root });
    const commitlintHub = readFileSync(join(root, "packages", "@commitlint__cli.md"), "utf8");
    assert.ok(existsSync(join(root, "runs", "commander-deep-minor-minor-1784387463.md")));
    assert.match(commitlintHub, /## 21\.1\.0 → 21\.2\.1/);
});

test("reconstructOutcome: single-project legacy dir parses changeset counts and marks the mechanism", () => {
    const runDir = cloneFixture("dryrun-alpha-minor-1783854242");
    const meta = JSON.parse(readFileSync(join(runDir, "_meta.json"), "utf8"));
    const outcome = reconstructOutcome(runDir, meta);
    assert.equal(outcome.gateOption, "unknown");
    assert.equal(outcome.projects.length, 1);
    assert.equal(outcome.projects[0].mechanism, "reconstructed");
    assert.equal(outcome.projects[0].changeset.applicable, 1);
    assert.equal(outcome.projects[0].changeset.inapplicable, 4);
});

test("copyRunKnowledge: omitting --outcome reconstructs one and marks the note seeded-legacy", () => {
    const runDir = cloneFixture("dryrun-alpha-minor-1783854242");
    const root = tempRoot();
    const result = copyRunKnowledge({ runDir, root });
    assert.equal(result.runId, "dryrun-alpha-minor-1783854242");
    const runNote = readFileSync(join(root, "runs", "dryrun-alpha-minor-1783854242.md"), "utf8");
    assert.match(runNote, /outcome: legacy/);
    assert.match(runNote, /source: seeded-legacy/);
});

test("copyRunKnowledge: a verification-failed changeset status passes through to the run note", () => {
    const runDir = cloneFixture("dryrun-alpha-minor-1783854242");
    const root = tempRoot();
    copyRunKnowledge({
        runDir,
        outcome: {
            runId: "dryrun-alpha-minor-1783854242",
            level: "minor",
            mode: "single-project",
            gateOption: "apply-all",
            projects: [
                {
                    projectName: "dryrun-alpha",
                    mechanism: "apply-npm-updates",
                    bumps: {
                        appliedGeneric: ["zod"],
                        appliedOverrides: [],
                        installRan: true,
                        logPath: null,
                        failure: null,
                    },
                    changeset: {
                        status: "verification-failed",
                        path: "changesets/changeset.md",
                        applicable: 1,
                        inapplicable: 4,
                    },
                },
            ],
        },
        root,
    });
    const runNote = readFileSync(join(root, "runs", "dryrun-alpha-minor-1783854242.md"), "utf8");
    assert.match(runNote, /changeset: verification-failed/);
});

test("copyRunKnowledge: --synthetic tags the note and every hub marker", () => {
    const runDir = cloneFixture("dryrun-alpha-minor-1783854242");
    const root = tempRoot();
    copyRunKnowledge({
        runDir,
        outcome: {
            runId: "dryrun-alpha-minor-1783854242",
            level: "minor",
            mode: "single-project",
            gateOption: "apply-all",
            projects: [
                {
                    projectName: "dryrun-alpha",
                    mechanism: "apply-npm-updates",
                    bumps: {
                        appliedGeneric: ["zod"],
                        appliedOverrides: [],
                        installRan: true,
                        logPath: null,
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
        },
        synthetic: true,
        root,
    });
    const runNote = readFileSync(join(root, "runs", "dryrun-alpha-minor-1783854242.md"), "utf8");
    assert.match(runNote, /tags: \[run, minor, single-project, synthetic, distilled\]/);
    const zodHub = readFileSync(join(root, "packages", "zod.md"), "utf8");
    assert.match(zodHub, /synthetic:true/);
});

test("copyRunKnowledge: several outcome.projects[] entries for one project (per-bucket apply) render as one project row", () => {
    // Per-bucket worktrees (level: major in the real flow) run apply once per
    // bucket, so outcome.projects[] carries several entries sharing one
    // projectName. The fixture's own level is what the outcome has to declare —
    // the writer rejects an identity that disagrees with `_meta.json`.
    const runDir = cloneFixture("dryrun-alpha-minor-1783854242");
    const root = tempRoot();
    const outcome = {
        runId: "dryrun-alpha-minor-1783854242",
        level: "minor",
        mode: "single-project",
        gateOption: "apply-all",
        projects: [
            {
                projectName: "dryrun-alpha",
                mechanism: "apply-npm-updates",
                bumps: {
                    appliedGeneric: ["chalk"],
                    appliedOverrides: [],
                    installRan: true,
                    logPath: "logs/apply-bucket-1.log",
                    failure: null,
                },
                changeset: {
                    status: "approved",
                    path: "changesets/changeset.md",
                    applicable: 1,
                    inapplicable: 4,
                },
            },
            {
                projectName: "dryrun-alpha",
                mechanism: "apply-npm-updates",
                bumps: {
                    appliedGeneric: ["lodash", "semver", "zod"],
                    appliedOverrides: [],
                    installRan: true,
                    logPath: "logs/apply-bucket-2.log",
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
    const result = copyRunKnowledge({ runDir, outcome, root });
    assert.equal(result.failed, undefined);

    const runNote = readFileSync(join(root, "runs", "dryrun-alpha-minor-1783854242.md"), "utf8");
    assert.match(runNote, /projects: \[dryrun-alpha\]/); // deduplicated, not [dryrun-alpha, dryrun-alpha]
    const projectHeadingCount = (runNote.match(/^### dryrun-alpha$/gm) ?? []).length;
    assert.equal(projectHeadingCount, 1); // one project row, not one per invocation
    assert.match(runNote, /invocation 1 —/);
    assert.match(runNote, /invocation 2 —/);
});

test("CLI: --outcome-file reads the outcome object from disk", () => {
    const runDir = cloneFixture("dryrun-alpha-minor-1783854242");
    const root = tempRoot();
    const outcomePath = join(dirname(runDir), "outcome-input.json");
    writeFileSync(
        outcomePath,
        JSON.stringify({
            runId: "dryrun-alpha-minor-1783854242",
            level: "minor",
            mode: "single-project",
            gateOption: "apply-all",
            projects: [
                {
                    projectName: "dryrun-alpha",
                    mechanism: "apply-npm-updates",
                    bumps: {
                        appliedGeneric: ["zod"],
                        appliedOverrides: [],
                        installRan: true,
                        logPath: null,
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
        }),
    );
    const scriptPath = join(dirname(fileURLToPath(import.meta.url)), "copy-run-knowledge.mjs");
    const out = execFileSync(
        process.execPath,
        [scriptPath, "--run-dir", runDir, "--outcome-file", outcomePath, "--root", root],
        { encoding: "utf8" },
    );
    const digest = JSON.parse(out);
    assert.equal(digest.runId, "dryrun-alpha-minor-1783854242");
    assert.equal(digest.root, root);
    assert.ok(existsSync(join(root, "runs", "dryrun-alpha-minor-1783854242.md")));
});
