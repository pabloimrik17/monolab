import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "vitest";
import { captureState, diffStates } from "./check-source-untouched.mjs";

function initRepo() {
    const dir = mkdtempSync(join(tmpdir(), "pregate-"));
    const git = (...args) =>
        execFileSync("git", ["-C", dir, ...args], {
            encoding: "utf8",
            env: {
                ...process.env,
                GIT_AUTHOR_NAME: "t",
                GIT_AUTHOR_EMAIL: "t@t",
                GIT_COMMITTER_NAME: "t",
                GIT_COMMITTER_EMAIL: "t@t",
            },
        });
    git("init", "-q");
    writeFileSync(join(dir, "package.json"), '{ "name": "fixture" }\n');
    git("add", ".");
    git("commit", "-qm", "init");
    return dir;
}

test("untouched tree diffs clean", () => {
    const dir = initRepo();
    const baseline = captureState(dir);
    assert.deepEqual(diffStates(baseline, captureState(dir)), []);
});

test("editing a tracked file is detected", () => {
    const dir = initRepo();
    const baseline = captureState(dir);
    writeFileSync(join(dir, "package.json"), '{ "name": "tampered" }\n');
    const changed = diffStates(baseline, captureState(dir));
    assert.ok(
        changed.some((c) => c.path === "package.json"),
        JSON.stringify(changed),
    );
});

test("new untracked file is detected", () => {
    const dir = initRepo();
    const baseline = captureState(dir);
    writeFileSync(join(dir, "sneaky.ts"), "export {};\n");
    const changed = diffStates(baseline, captureState(dir));
    assert.ok(changed.some((c) => c.path === "sneaky.ts"));
});

test("edit to an already-dirty file is detected via content hash", () => {
    const dir = initRepo();
    writeFileSync(join(dir, "wip.txt"), "dirty before teammate\n");
    const baseline = captureState(dir);
    writeFileSync(join(dir, "wip.txt"), "teammate edited this\n");
    const changed = diffStates(baseline, captureState(dir));
    assert.ok(changed.some((c) => c.path === "wip.txt" && c.kind === "content-changed"));
});

test("removing a previously-dirty file is detected", () => {
    const dir = initRepo();
    writeFileSync(join(dir, "wip.txt"), "dirty\n");
    const baseline = captureState(dir);
    rmSync(join(dir, "wip.txt"));
    const changed = diffStates(baseline, captureState(dir));
    assert.ok(changed.some((c) => c.path === "wip.txt"));
});

test("new file inside an already-untracked directory is detected", () => {
    const dir = initRepo();
    mkdirSync(join(dir, "untracked-dir"));
    writeFileSync(join(dir, "untracked-dir", "a.txt"), "a\n");
    const baseline = captureState(dir);
    writeFileSync(join(dir, "untracked-dir", "b.txt"), "b\n");
    const changed = diffStates(baseline, captureState(dir));
    assert.ok(changed.some((c) => c.path === "untracked-dir/b.txt"));
});
