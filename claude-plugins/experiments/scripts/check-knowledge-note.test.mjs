import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "vitest";
import { checkKnowledgeNote, checkKnowledgeNotes } from "./check-knowledge-note.mjs";
import { appendPreimageMarker, parseFrontmatter, serializeFrontmatter } from "./lib/knowledge.mjs";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "check-knowledge-note.mjs");

function runNoteData(overrides = {}) {
    return {
        type: "run",
        runId: "run-a",
        level: "minor",
        mode: "single-project",
        createdAt: "2026-01-01T00:00:00Z",
        persistedAt: "2026-01-02T00:00:00Z",
        projects: ["demo"],
        packages: ["zod@3.23.0..3.24.1"],
        outcome: "applied",
        gateOption: "apply-all",
        status: "ok",
        source: "run-dir",
        tags: ["run", "minor", "single-project"],
        ...overrides,
    };
}

function runNoteBody(summary = "Did the thing.") {
    return [
        "# Run run-a",
        "",
        "## Summary",
        "<!-- slot:summary -->",
        summary,
        "<!-- /slot -->",
        "",
        "## Packages",
        "",
        "| package | range | hub | outcome |",
        "| --- | --- | --- | --- |",
        "| zod | 3.23.0 → 3.24.1 | [[packages/zod#3.23.0 → 3.24.1]] | applicable |",
        "",
        "## Applied",
        "",
        "- demo: 1 bump(s) applied; changeset approved; applicable 1, inapplicable 4",
        "",
    ].join("\n");
}

function compliantRunNote() {
    return appendPreimageMarker(serializeFrontmatter(runNoteData(), runNoteBody()));
}

function hubData(overrides = {}) {
    return {
        type: "package",
        name: "zod",
        ranges: ["3.23.0..3.24.1"],
        runs: ["[[runs/run-a]]"],
        latest: "3.24.1",
        tags: ["package"],
        ...overrides,
    };
}

function hubBody(universal = "- fixed a thing", summary = "Adopt it.") {
    return [
        "",
        "# zod",
        "",
        "## 3.23.0 → 3.24.1",
        "<!-- run:run-a level:minor mode:single-project synthetic:false supersededBy: -->",
        "> [!info] Source: [[runs/run-a]] · minor · single-project · 2026-01-01T00:00:00Z",
        "",
        "### Universal",
        "<!-- slot:universal -->",
        universal,
        "<!-- /slot -->",
        "",
        "### Applied",
        "",
        "- demo: applicable: fixed a thing",
        "",
        "### Summary",
        "<!-- slot:summary -->",
        summary,
        "<!-- /slot -->",
        "",
    ].join("\n");
}

function compliantHub() {
    return appendPreimageMarker(serializeFrontmatter(hubData(), hubBody()));
}

test("compliant run note has no violations", () => {
    assert.deepEqual(checkKnowledgeNote("note.md", compliantRunNote()), []);
});

test("compliant package hub has no violations", () => {
    assert.deepEqual(checkKnowledgeNote("hub.md", compliantHub()), []);
});

test("missing-key: dropping a required run-note key is flagged", () => {
    const data = runNoteData();
    delete data.gateOption;
    const violations = checkKnowledgeNote(
        "note.md",
        appendPreimageMarker(serializeFrontmatter(data, runNoteBody())),
    );
    assert.ok(violations.some((v) => v.rule === "missing-key" && v.message.includes("gateOption")));
});

test("unexpected-key: an unlisted frontmatter key is flagged", () => {
    const data = runNoteData({ extra: "nope" });
    const violations = checkKnowledgeNote(
        "note.md",
        appendPreimageMarker(serializeFrontmatter(data, runNoteBody())),
    );
    assert.ok(violations.some((v) => v.rule === "unexpected-key" && v.message.includes("extra")));
});

test("wrong-type: a scalar where a string list is required is flagged", () => {
    const raw = serializeFrontmatter(runNoteData(), runNoteBody()).replace(
        "tags: [run, minor, single-project]",
        "tags: not-a-list",
    );
    const violations = checkKnowledgeNote("note.md", appendPreimageMarker(raw));
    assert.ok(violations.some((v) => v.rule === "wrong-type" && v.message.includes("tags")));
});

test("invalid-enum: an out-of-range enum value is flagged", () => {
    const data = runNoteData({ status: "weird" });
    const violations = checkKnowledgeNote(
        "note.md",
        appendPreimageMarker(serializeFrontmatter(data, runNoteBody())),
    );
    assert.ok(violations.some((v) => v.rule === "invalid-enum" && v.message.includes("status")));
});

test("unknown-type: a note whose frontmatter type is neither run nor package is flagged", () => {
    const data = runNoteData({ type: "mystery" });
    const violations = checkKnowledgeNote(
        "note.md",
        appendPreimageMarker(serializeFrontmatter(data, runNoteBody())),
    );
    assert.ok(violations.some((v) => v.rule === "unknown-type"));
});

test("unfilled-slot: an empty slot after the fill step is flagged", () => {
    const content = compliantRunNote().replace(
        "<!-- slot:summary -->\nDid the thing.\n<!-- /slot -->",
        "<!-- slot:summary -->\n<!-- /slot -->",
    );
    const violations = checkKnowledgeNote("note.md", content);
    assert.ok(violations.some((v) => v.rule === "unfilled-slot"));
});

test("unfilled-slot: a residual distill marker still counts as unfilled", () => {
    const content = compliantHub().replace("- fixed a thing", "<!-- distill -->");
    const violations = checkKnowledgeNote("hub.md", content);
    assert.ok(violations.some((v) => v.rule === "unfilled-slot"));
});

test("code-block-in-slot: a fenced code block inside a slot is flagged", () => {
    const content = compliantRunNote().replace("Did the thing.", "```js\nconsole.log(1)\n```");
    const violations = checkKnowledgeNote("note.md", content);
    assert.ok(violations.some((v) => v.rule === "code-block-in-slot"));
});

test("slot-line-cap: a run-note summary over 8 lines is flagged", () => {
    const nineLines = Array.from({ length: 9 }, (_, i) => `line ${i}`).join("\n");
    const content = compliantRunNote().replace("Did the thing.", nineLines);
    const violations = checkKnowledgeNote("note.md", content);
    assert.ok(violations.some((v) => v.rule === "slot-line-cap"));
});

test("slot-line-cap: a hub summary over 5 lines is flagged", () => {
    const sixLines = Array.from({ length: 6 }, (_, i) => `line ${i}`).join("\n");
    const content = compliantHub().replace("Adopt it.", sixLines);
    const violations = checkKnowledgeNote("hub.md", content);
    assert.ok(violations.some((v) => v.rule === "slot-line-cap"));
});

test('plan-in-heading: a heading containing "plan" is flagged', () => {
    const data = runNoteData();
    const body = runNoteBody().replace("## Packages", "## Packages (plan)");
    const content = appendPreimageMarker(serializeFrontmatter(data, body));
    const violations = checkKnowledgeNote("note.md", content);
    assert.ok(violations.some((v) => v.rule === "plan-in-heading"));
});

test("edited-outside-slot: a change outside a slot after the marker was written is flagged", () => {
    const content = compliantRunNote().replace("# Run run-a", "# Run run-a (edited)");
    const violations = checkKnowledgeNote("note.md", content);
    assert.ok(violations.some((v) => v.rule === "edited-outside-slot"));
});

test("edited-outside-slot: filling a slot alone does not trip the pre-image check", () => {
    // Regression: the fill step itself must not be misdetected as an
    // out-of-slot edit — only the compliant fixtures above prove that, but
    // this pins it against the specific "content changed inside a slot"
    // case explicitly.
    const written = appendPreimageMarker(
        serializeFrontmatter(hubData(), hubBody("<!-- distill -->", "")),
    );
    const filled = written
        .replace("<!-- distill -->", "- distilled finding")
        .replace(
            "<!-- slot:summary -->\n\n<!-- /slot -->",
            "<!-- slot:summary -->\nAdopt it.\n<!-- /slot -->",
        );
    const violations = checkKnowledgeNote("hub.md", filled);
    assert.ok(!violations.some((v) => v.rule === "edited-outside-slot"));
});

test("--root: a relative path resolves against it; an absolute path passes through", () => {
    const dir = mkdtempSync(join(tmpdir(), "check-knowledge-root-"));
    const runsDir = join(dir, "runs");
    mkdirSync(runsDir, { recursive: true });
    writeFileSync(join(runsDir, "run-a.md"), compliantRunNote());

    const result = checkKnowledgeNotes(["runs/run-a.md"], { root: dir });
    assert.deepEqual(result, { ok: true, violations: [] });

    const absoluteResult = checkKnowledgeNotes([join(runsDir, "run-a.md")], {
        root: "/nonexistent-root-should-be-ignored",
    });
    assert.deepEqual(absoluteResult, { ok: true, violations: [] });
});

test("--mark-draft: residual violations write status: draft into the run note and report it", () => {
    const dir = mkdtempSync(join(tmpdir(), "check-knowledge-mark-draft-"));
    const notePath = join(dir, "run-a.md");
    writeFileSync(notePath, compliantRunNote().replace("Did the thing.", "")); // unfilled-slot violation

    const result = checkKnowledgeNotes([notePath], { markDraft: true });
    assert.equal(result.ok, false);
    assert.equal(result.status, "draft");

    const { data } = parseFrontmatter(readFileSync(notePath, "utf8"));
    assert.equal(data.status, "draft");

    // Stamping `draft` rewrites frontmatter, which lives outside every slot.
    // Without restamping the pre-image the note would report a phantom
    // `edited-outside-slot` on every later run, on top of the real violation.
    const again = checkKnowledgeNotes([notePath], {});
    assert.deepEqual(
        again.violations.filter((v) => v.rule === "edited-outside-slot"),
        [],
        "marking a note draft must not make it look model-edited",
    );
});

test("--mark-draft: a compliant note reports status ok and writes nothing", () => {
    const dir = mkdtempSync(join(tmpdir(), "check-knowledge-mark-draft-ok-"));
    const notePath = join(dir, "run-a.md");
    const original = compliantRunNote();
    writeFileSync(notePath, original);

    const result = checkKnowledgeNotes([notePath], { markDraft: true });
    assert.equal(result.ok, true);
    assert.equal(result.status, "ok");
    assert.equal(readFileSync(notePath, "utf8"), original);
});

test("--mark-draft: marks the run note even when a hub file in the same batch is what failed", () => {
    const dir = mkdtempSync(join(tmpdir(), "check-knowledge-mark-draft-hub-"));
    const notePath = join(dir, "run-a.md");
    const hubPath = join(dir, "hub-a.md");
    writeFileSync(notePath, compliantRunNote());
    writeFileSync(hubPath, compliantHub().replace("Adopt it.", "")); // hub's own slot unfilled

    const result = checkKnowledgeNotes([notePath, hubPath], { markDraft: true });
    assert.equal(result.ok, false);
    assert.equal(result.status, "draft");
    const { data } = parseFrontmatter(readFileSync(notePath, "utf8"));
    assert.equal(data.status, "draft");
});

test("CLI: --mark-draft flag flows through and --root resolves a relative digest path", () => {
    const dir = mkdtempSync(join(tmpdir(), "check-knowledge-cli-mark-draft-"));
    const runsDir = join(dir, "runs");
    mkdirSync(runsDir, { recursive: true });
    writeFileSync(join(runsDir, "run-a.md"), compliantRunNote().replace("Did the thing.", ""));

    let threw = null;
    let out;
    try {
        out = execFileSync(
            process.execPath,
            [SCRIPT, "--root", dir, "--mark-draft", "runs/run-a.md"],
            { encoding: "utf8" },
        );
    } catch (err) {
        threw = err;
        out = err.stdout;
    }
    assert.ok(threw);
    const result = JSON.parse(out);
    assert.equal(result.status, "draft");
    const { data } = parseFrontmatter(readFileSync(join(runsDir, "run-a.md"), "utf8"));
    assert.equal(data.status, "draft");
});

test("CLI: compliant note exits 0 with ok:true; violating note exits 1 with a violations list", () => {
    const dir = mkdtempSync(join(tmpdir(), "check-knowledge-note-"));
    const goodPath = join(dir, "good.md");
    const badPath = join(dir, "bad.md");
    writeFileSync(goodPath, compliantRunNote());
    writeFileSync(badPath, compliantRunNote().replace("Did the thing.", ""));

    const good = JSON.parse(
        execFileSync(process.execPath, [SCRIPT, goodPath], { encoding: "utf8" }),
    );
    assert.deepEqual(good, { ok: true, violations: [] });

    let threw = null;
    try {
        execFileSync(process.execPath, [SCRIPT, badPath], { encoding: "utf8" });
    } catch (err) {
        threw = err;
    }
    assert.ok(threw);
    assert.equal(threw.status, 1);
    const result = JSON.parse(threw.stdout);
    assert.equal(result.ok, false);
    assert.ok(result.violations.some((v) => v.rule === "unfilled-slot"));
});
