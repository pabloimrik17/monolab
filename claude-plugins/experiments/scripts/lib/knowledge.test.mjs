import assert from "node:assert/strict";
import { homedir } from "node:os";
import { join } from "node:path";
import { test } from "vitest";
import {
    appendPreimageMarker,
    buildRunMarker,
    bucketKeyFromGroupId,
    CHANGESET_STATUSES,
    classifyRange,
    computeDelta,
    emptySlot,
    findSectionMarker,
    findSlots,
    isSlotUnfilled,
    nextNonBlankIndex,
    parseFrontmatter,
    parseResearchPackages,
    parseRunMarker,
    pkgSlug,
    rangesOverlap,
    resolveKnowledgeRoot,
    serializeFrontmatter,
    stripPreimageMarker,
    universalContent,
    verifyPreimage,
    withSupersededBy,
} from "./knowledge.mjs";

test("resolveKnowledgeRoot defaults to ~/.claude/experiments/knowledge", () => {
    assert.equal(resolveKnowledgeRoot({}), join(homedir(), ".claude", "experiments", "knowledge"));
    assert.equal(resolveKnowledgeRoot({ knowledge_root: "" }), resolveKnowledgeRoot({}));
});

test("resolveKnowledgeRoot expands a tilde-prefixed override", () => {
    assert.equal(
        resolveKnowledgeRoot({ knowledge_root: "~/vaults/updates" }),
        join(homedir(), "vaults/updates"),
    );
});

test("resolveKnowledgeRoot accepts an absolute override verbatim", () => {
    assert.equal(resolveKnowledgeRoot({ knowledge_root: "/opt/knowledge" }), "/opt/knowledge");
});

test("resolveKnowledgeRoot rejects a relative override with the exact message", () => {
    assert.throws(
        () => resolveKnowledgeRoot({ knowledge_root: "rel/path" }),
        (err) => {
            assert.equal(err.message, "knowledge_root must be absolute or ~-prefixed.");
            assert.equal(String(err), "Error: knowledge_root must be absolute or ~-prefixed.");
            return true;
        },
    );
});

test("CHANGESET_STATUSES carries all six values including verification-failed", () => {
    assert.deepEqual(CHANGESET_STATUSES, [
        "approved",
        "rejected",
        "skipped",
        "not-run",
        "verification-failed",
        "unknown",
    ]);
});

test("pkgSlug matches the changelog cache slug rule", () => {
    assert.equal(pkgSlug("@nx/js"), "@nx__js");
    assert.equal(pkgSlug("eslint"), "eslint");
});

test("frontmatter round-trips scalars and string lists", () => {
    const data = {
        type: "run",
        runId: "commander-deep-minor-minor-1784387463",
        level: "minor",
        mode: "cross-project",
        createdAt: "2026-07-18T15:11:03Z",
        projects: ["dotfiles", "monolab"],
        packages: ["@commitlint/cli@21.1.0..21.2.1", "@nx/js@23.0.2..23.1.0"],
        tags: ["run", "minor", "cross-project"],
    };
    const note = serializeFrontmatter(data, "# Run\n");
    const { data: parsed, body } = parseFrontmatter(note);
    assert.deepEqual(parsed, data);
    assert.equal(body, "# Run\n");
    for (const [key, value] of Object.entries(parsed)) {
        if (Array.isArray(value)) {
            assert.ok(
                value.every((v) => typeof v === "string"),
                `${key} must be a string list`,
            );
        } else {
            assert.equal(typeof value, "string", `${key} must be a scalar string`);
        }
    }
});

test("frontmatter quotes values that would otherwise be ambiguous", () => {
    const note = serializeFrontmatter({ name: "@commitlint/cli", ranges: ["21.1.0..21.2.1"] });
    assert.match(note, /name: "@commitlint\/cli"/);
    assert.match(note, /ranges: \["21\.1\.0\.\.21\.2\.1"\]/);
});

test("parseFrontmatter returns an empty object for content without frontmatter", () => {
    assert.deepEqual(parseFrontmatter("# no frontmatter\n"), {
        data: {},
        body: "# no frontmatter\n",
    });
});

test("slot helpers: empty, found, unfilled vs filled vs distill", () => {
    const content = `## 23.0.2 → 23.1.0\n\n### Universal\n${emptySlot("universal")}\n\n### Summary\n${emptySlot("summary")}\n`;
    const slots = findSlots(content);
    assert.equal(slots.length, 2);
    assert.equal(slots[0].name, "universal");
    assert.ok(isSlotUnfilled(slots[0].content));
    assert.ok(!isSlotUnfilled("some real content"));
    assert.ok(isSlotUnfilled("\n<!-- distill -->\n"));
    assert.ok(isSlotUnfilled("\n<!-- no-research -->\n"));
});

test("run marker round-trips and supersededBy can be rewritten", () => {
    const line = buildRunMarker({
        runId: "run-a",
        level: "minor",
        mode: "cross-project",
        synthetic: false,
        supersededBy: null,
    });
    assert.equal(
        line,
        "<!-- run:run-a level:minor mode:cross-project synthetic:false supersededBy: -->",
    );
    assert.deepEqual(parseRunMarker(line), {
        runId: "run-a",
        level: "minor",
        mode: "cross-project",
        synthetic: false,
        supersededBy: null,
    });
    const updated = withSupersededBy(line, "run-b");
    assert.equal(parseRunMarker(updated).supersededBy, "run-b");
});

test("findSectionMarker tolerates a blank line between the heading and the marker", () => {
    const lines = [
        "## 23.0.2 → 23.1.0",
        "",
        "<!-- run:run-a level:minor mode:cross-project synthetic:false supersededBy: -->",
        "",
        "body",
    ];
    const result = findSectionMarker(lines, 0);
    assert.equal(result.index, 2);
    assert.equal(result.marker.runId, "run-a");
});

test("nextNonBlankIndex skips blank lines and returns -1 at end of input", () => {
    assert.equal(nextNonBlankIndex(["", "  ", "x"], 0), 2);
    assert.equal(nextNonBlankIndex(["", ""], 0), -1);
});

test("bucketKeyFromGroupId strips the trailing -<n>", () => {
    assert.equal(bucketKeyFromGroupId("nx-1"), "nx");
    assert.equal(bucketKeyFromGroupId("commitlint-1"), "commitlint");
    assert.equal(bucketKeyFromGroupId("solo-chalk-1"), "solo-chalk");
});

test("parseResearchPackages: cross-project universal-only heading contract", () => {
    const content = [
        "# Research — group nx-1",
        "",
        "## @nx/js (23.0.2 → 23.1.0)",
        "",
        "### Workarounds resolved (universal)",
        "",
        "- fixed the thing",
        "",
        "### Improvements applicable (universal)",
        "",
        "- new API",
        "",
    ].join("\n");
    const [pkg] = parseResearchPackages(content);
    assert.equal(pkg.name, "@nx/js");
    assert.equal(pkg.from, "23.0.2");
    assert.equal(pkg.to, "23.1.0");
    assert.equal(pkg.format, "universal-only");
    assert.equal(pkg.sourceRunId, null);
    assert.match(universalContent(pkg), /fixed the thing/);
    assert.match(universalContent(pkg), /new API/);
});

test("parseResearchPackages: legacy two-heading contract has no universal content", () => {
    const content = [
        "## chalk (4.1.0 → 4.1.2)",
        "",
        "### Workarounds resolved",
        "",
        "_no findings_",
        "",
        "### Improvements applicable",
        "",
        "_no findings_",
        "",
    ].join("\n");
    const [pkg] = parseResearchPackages(content);
    assert.equal(pkg.format, "legacy");
    assert.equal(universalContent(pkg), null);
});

test("parseResearchPackages: single-project D8 split carries both universal and this-project", () => {
    const content = [
        "## react (18.2.0 → 18.3.0)",
        "",
        "### Workarounds resolved (universal)",
        "",
        "_no findings_",
        "",
        "### Workarounds resolved (this project)",
        "",
        "_no findings_",
        "",
        "### Improvements applicable (universal)",
        "",
        "- new hook",
        "",
        "### Improvements applicable (this project)",
        "",
        "- adopt it in src/app.tsx. Justification: reduces boilerplate.",
        "",
    ].join("\n");
    const [pkg] = parseResearchPackages(content);
    assert.equal(pkg.format, "split");
    const universal = universalContent(pkg);
    assert.match(universal, /new hook/);
    assert.ok(!universal.includes("Justification"));
});

test("parseResearchPackages: exact-hit copy carries the source line and is stripped from sections", () => {
    const content = [
        "## @nx/js (23.0.2 → 23.1.0)",
        "",
        "source: prior-run commander-deep-minor-minor-1784387463",
        "",
        "### Universal",
        "",
        "**Workarounds resolved (universal)**",
        "",
        "- fixed the thing",
        "",
        "**Improvements applicable (universal)**",
        "",
        "- new API",
        "",
    ].join("\n");
    const [pkg] = parseResearchPackages(content);
    assert.equal(pkg.sourceRunId, "commander-deep-minor-minor-1784387463");
    assert.equal(pkg.format, "universal-only");
    assert.ok(!pkg.sections["Workarounds resolved (universal)"].includes("source:"));
    assert.match(universalContent(pkg), /fixed the thing/);
    assert.match(universalContent(pkg), /new API/);
});

test("classifyRange: identical range is exact", () => {
    const hit = classifyRange({ from: "23.0.2", to: "23.1.0" }, { from: "23.0.2", to: "23.1.0" });
    assert.deepEqual(hit, { class: "exact", delta: null });
});

test("classifyRange: disjoint earlier range is prior", () => {
    const hit = classifyRange({ from: "23.0.2", to: "23.1.0" }, { from: "23.1.0", to: "23.2.0" });
    assert.deepEqual(hit, { class: "prior", delta: null });
});

test("classifyRange: intersecting range is overlap with the correct delta", () => {
    const hit = classifyRange({ from: "23.0.2", to: "23.1.0" }, { from: "23.0.5", to: "23.3.0" });
    assert.equal(hit.class, "overlap");
    assert.equal(hit.delta, "(23.1.0, 23.3.0]");
});

test("classifyRange: a covering range is overlap with no delta", () => {
    const hit = classifyRange({ from: "23.0.0", to: "23.2.0" }, { from: "23.0.5", to: "23.1.0" });
    assert.deepEqual(hit, { class: "overlap", delta: null });
});

test("classifyRange: no relation returns null", () => {
    const hit = classifyRange({ from: "23.5.0", to: "23.6.0" }, { from: "23.1.0", to: "23.2.0" });
    assert.equal(hit, null);
});

test("preimage marker: unedited slot fill still verifies", () => {
    const written = appendPreimageMarker(`## x\n${emptySlot("summary")}\n`);
    const filled = written.replace(
        emptySlot("summary"),
        `<!-- slot:summary -->\nfilled\n<!-- /slot -->`,
    );
    assert.deepEqual(verifyPreimage(filled), { ok: true, reason: null });
});

test("preimage marker: an edit outside the slot fails verification", () => {
    const written = appendPreimageMarker(`## x\n${emptySlot("summary")}\n`);
    const tampered = written.replace("## x", "## x (tampered)");
    const result = verifyPreimage(tampered);
    assert.equal(result.ok, false);
});

test.each([" ", "\n"])("preimage marker: rejects trailing bytes %j", (suffix) => {
    const written = appendPreimageMarker(`## x\n${emptySlot("summary")}\n`);
    assert.equal(verifyPreimage(`${written}${suffix}`).ok, false);
});

test("stripPreimageMarker removes the trailing marker cleanly", () => {
    const original = `## x\n${emptySlot("summary")}\n`;
    const written = appendPreimageMarker(original);
    assert.equal(stripPreimageMarker(written), original);
});

test("rangesOverlap and computeDelta agree on boundary (touching, not overlapping)", () => {
    assert.ok(!rangesOverlap({ from: "1.0.0", to: "2.0.0" }, { from: "2.0.0", to: "3.0.0" }));
    assert.equal(
        computeDelta({ from: "1.0.0", to: "2.0.0" }, { from: "1.5.0", to: "1.9.0" }),
        null,
    );
});
