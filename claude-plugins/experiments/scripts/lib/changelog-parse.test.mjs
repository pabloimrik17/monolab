import assert from "node:assert/strict";
import { test } from "vitest";
import {
    detectPattern,
    extractSections,
    versionFromHeading,
} from "./changelog-parse.mjs";

test("detectPattern picks the highest-priority match", () => {
    const conventional = "## [3.5.28](https://x) (2026-02-09)\n\n- fix";
    assert.equal(detectPattern(conventional).id, "conventional-changelog");
    const eslintStyle = "v10.0.0 - February 6, 2026\n\n* fix: things";
    assert.equal(detectPattern(eslintStyle).id, "eslint-style");
    const bareH2 = "## 5.105.1\n\n- chore";
    assert.equal(detectPattern(bareH2).id, "h2-bare");
    assert.equal(detectPattern("no versions here"), null);
});

test("versionFromHeading strips prefixes, brackets, dates", () => {
    assert.equal(versionFromHeading("## [3.5.28](url) (2026-02-09)"), "3.5.28");
    assert.equal(versionFromHeading("v10.0.0 - February 6, 2026"), "10.0.0");
    assert.equal(versionFromHeading("# 21.2.0 (2026-02-11)"), "21.2.0");
});

test("extractSections splits h2 sections to the next heading", () => {
    const content = [
        "# Changelog",
        "",
        "## 2.0.0 (2026-01-01)",
        "",
        "- breaking things",
        "",
        "## 1.1.0 (2025-12-01)",
        "",
        "- minor things",
    ].join("\n");
    const sections = extractSections(content);
    assert.deepEqual([...sections.keys()], ["2.0.0", "1.1.0"]);
    assert.match(sections.get("2.0.0"), /breaking things/);
    assert.ok(!sections.get("2.0.0").includes("minor things"));
    assert.match(sections.get("1.1.0"), /minor things/);
});

test("extractSections keeps Angular anchor lines with their section", () => {
    const content = [
        '<a name="19.0.1"></a>',
        "## 19.0.1 (2026-01-05)",
        "",
        "- fix a",
        '<a name="19.0.0"></a>',
        "## 19.0.0 (2026-01-01)",
        "",
        "- fix b",
    ].join("\n");
    const sections = extractSections(content);
    assert.match(sections.get("19.0.1"), /^<a name="19\.0\.1">/);
    assert.ok(!sections.get("19.0.1").includes('name="19.0.0"'));
});

test("extractSections handles setext style", () => {
    const content = [
        "5.2.1 / 2025-12-01",
        "==================",
        "",
        "- patch stuff",
        "",
        "5.2.0 / 2025-11-01",
        "==================",
        "",
        "- feature stuff",
    ].join("\n");
    const sections = extractSections(content);
    assert.match(sections.get("5.2.1"), /patch stuff/);
    assert.match(sections.get("5.2.0"), /feature stuff/);
});

test("first occurrence wins on duplicate version headings", () => {
    const content = [
        "## 1.0.0 (2026-01-01)",
        "- real entry",
        "## 1.0.0 (2026-01-01)",
        "- duplicate entry",
    ].join("\n");
    const sections = extractSections(content);
    assert.match(sections.get("1.0.0"), /real entry/);
});
