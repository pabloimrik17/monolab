#!/usr/bin/env node
/**
 * check-knowledge-note — D5 step 3: validates a run note or package hub
 * after the subagent has filled its slots. Checks frontmatter keys and
 * types, that every slot is filled, per-slot line caps, no fenced code
 * block inside a slot, no edit outside a slot (the script's own pre-image
 * hash), and no occurrence of "plan" in a heading.
 *
 * Usage:
 *   check-knowledge-note.mjs [--root <dir>] [--mark-draft] <path...>
 *
 * `--root` defaults to `resolveKnowledgeRoot()` when omitted; a relative
 * `<path>` (e.g. `runs/<runId>.md`, straight from the copy step's digest)
 * resolves against it, an absolute path is used as-is.
 *
 * `--mark-draft`: when violations remain, writes `status: draft` into the
 * run-note frontmatter (frontmatter is script-owned; a model never sets
 * this) and reports the resulting `status` (`ok` | `draft`).
 *
 * Output: JSON { ok, violations: [{ rule, file, message }], status? }.
 * Exit codes: 0 = compliant; 1 = violations found; 2 = usage error.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import {
    appendPreimageMarker,
    findSlots,
    isSlotUnfilled,
    parseFrontmatter,
    resolveKnowledgeRoot,
    serializeFrontmatter,
    stripPreimageMarker,
    verifyPreimage,
} from "./lib/knowledge.mjs";

function fail(message) {
    process.stderr.write(`check-knowledge-note: ${message}\n`);
    process.exit(2);
}

function parseArgs(argv) {
    const args = { markDraft: false, paths: [] };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--root") args.root = argv[++i];
        else if (a === "--mark-draft") args.markDraft = true;
        else args.paths.push(a);
    }
    if (args.paths.length === 0) fail("at least one <path> is required");
    return args;
}

const RUN_REQUIRED_KEYS = [
    "type",
    "runId",
    "level",
    "mode",
    "createdAt",
    "persistedAt",
    "projects",
    "packages",
    "outcome",
    "gateOption",
    "status",
    "source",
    "tags",
];
const RUN_OPTIONAL_KEYS = ["distilled"];
const RUN_LIST_KEYS = ["projects", "packages", "tags"];
const RUN_ENUMS = {
    level: ["patch", "minor", "major", "engines"],
    mode: ["single-project", "cross-project"],
    outcome: ["applied", "partial", "legacy"],
    gateOption: ["apply-all", "apply-bumps-only", "pick-subset", "unknown"],
    status: ["ok", "draft"],
    source: ["run-dir", "seeded-legacy"],
};

const HUB_REQUIRED_KEYS = ["type", "name", "ranges", "runs", "latest", "tags"];
const HUB_LIST_KEYS = ["ranges", "runs", "tags"];

function isStringList(value) {
    return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function checkKeys(data, required, optional, file, noun) {
    const violations = [];
    for (const key of required) {
        if (!(key in data)) {
            violations.push({
                rule: "missing-key",
                file,
                message: `${noun} is missing frontmatter key "${key}"`,
            });
        }
    }
    for (const key of Object.keys(data)) {
        if (!required.includes(key) && !optional.includes(key)) {
            violations.push({
                rule: "unexpected-key",
                file,
                message: `${noun} has unexpected frontmatter key "${key}"`,
            });
        }
    }
    return violations;
}

function checkListTypes(data, listKeys, file, noun) {
    const violations = [];
    for (const key of listKeys) {
        if (key in data && !isStringList(data[key])) {
            violations.push({
                rule: "wrong-type",
                file,
                message: `${noun} "${key}" must be a list of strings`,
            });
        }
    }
    return violations;
}

function checkRunFrontmatter(data, file) {
    const violations = [
        ...checkKeys(data, RUN_REQUIRED_KEYS, RUN_OPTIONAL_KEYS, file, "run note"),
        ...checkListTypes(data, RUN_LIST_KEYS, file, "run note"),
    ];
    for (const [key, allowed] of Object.entries(RUN_ENUMS)) {
        if (key in data && !allowed.includes(data[key])) {
            violations.push({
                rule: "invalid-enum",
                file,
                message: `run note "${key}" must be one of ${allowed.join("|")}, got "${data[key]}"`,
            });
        }
    }
    if ("distilled" in data && data.distilled !== true) {
        violations.push({
            rule: "invalid-enum",
            file,
            message: `run note "distilled" must be boolean true when present, got "${data.distilled}"`,
        });
    }
    return violations;
}

function checkHubFrontmatter(data, file) {
    const violations = [
        ...checkKeys(data, HUB_REQUIRED_KEYS, [], file, "package hub"),
        ...checkListTypes(data, HUB_LIST_KEYS, file, "package hub"),
    ];
    if ("name" in data && typeof data.name !== "string") {
        violations.push({
            rule: "wrong-type",
            file,
            message: 'package hub "name" must be a scalar string',
        });
    }
    return violations;
}

function checkSlots(content, noteType, file) {
    const violations = [];
    for (const slot of findSlots(content)) {
        if (isSlotUnfilled(slot.content)) {
            violations.push({
                rule: "unfilled-slot",
                file,
                message: `slot "${slot.name}" is unfilled`,
            });
            continue;
        }
        if (slot.content.includes("```")) {
            violations.push({
                rule: "code-block-in-slot",
                file,
                message: `slot "${slot.name}" contains a fenced code block`,
            });
        }
        if (slot.name === "summary") {
            const cap = noteType === "run" ? 8 : 5;
            const lineCount = slot.content.split("\n").filter((l) => l.trim() !== "").length;
            if (lineCount > cap) {
                violations.push({
                    rule: "slot-line-cap",
                    file,
                    message: `slot "summary" has ${lineCount} lines, cap is ${cap}`,
                });
            }
        }
    }
    return violations;
}

function checkHeadings(content, file) {
    const violations = [];
    for (const line of content.split("\n")) {
        const m = /^#{1,6} (.+)$/.exec(line);
        if (m && /plan/i.test(m[1])) {
            violations.push({
                rule: "plan-in-heading",
                file,
                message: `heading "${line.trim()}" contains "plan"`,
            });
        }
    }
    return violations;
}

function checkPreimage(content, file) {
    const result = verifyPreimage(content);
    if (result.ok) return [];
    return [{ rule: "edited-outside-slot", file, message: result.reason }];
}

export function checkKnowledgeNote(file, content) {
    const { data } = parseFrontmatter(content);
    const violations = [];
    if (data.type === "run") {
        violations.push(...checkRunFrontmatter(data, file));
    } else if (data.type === "package") {
        violations.push(...checkHubFrontmatter(data, file));
    } else {
        violations.push({
            rule: "unknown-type",
            file,
            message: `frontmatter "type" must be "run" or "package", got ${JSON.stringify(data.type)}`,
        });
    }
    violations.push(...checkSlots(content, data.type, file));
    violations.push(...checkHeadings(content, file));
    violations.push(...checkPreimage(content, file));
    return violations;
}

/**
 * `--mark-draft`: writes the validation result into the run note among
 * `files` (`draft` on residual violations, `ok` after clean revalidation).
 * Frontmatter is script-owned; a model never edits it. Hub files carry no
 * `status` field — recall excludes them through the range's owning run.
 */
function writeRunNoteStatus(contents, status) {
    const runEntry = contents.find(({ content }) => parseFrontmatter(content).data.type === "run");
    if (!runEntry) return;
    const { data, body } = parseFrontmatter(runEntry.content);
    if (data.status === status) return;
    data.status = status;
    // Frontmatter is script-owned content outside every slot, so this write
    // has to restamp the hash it invalidates — otherwise the note reports an
    // `edited-outside-slot` violation forever after, on top of the real one.
    const updated = serializeFrontmatter(data, body);
    writeFileSync(runEntry.file, appendPreimageMarker(stripPreimageMarker(updated)));
}

export function checkKnowledgeNotes(files, { root, markDraft = false } = {}) {
    const resolvedRoot = root ?? resolveKnowledgeRoot();
    const resolvedFiles = files.map((f) => (isAbsolute(f) ? f : join(resolvedRoot, f)));
    const contents = resolvedFiles.map((file) => ({ file, content: readFileSync(file, "utf8") }));
    const runNoteCount = contents.filter(
        ({ content }) => parseFrontmatter(content).data.type === "run",
    ).length;
    if (markDraft && runNoteCount > 1) {
        throw new Error("--mark-draft accepts at most one run note");
    }
    const violations = contents.flatMap(({ file, content }) => checkKnowledgeNote(file, content));
    const result = { ok: violations.length === 0, violations };
    if (markDraft) {
        const status = violations.length === 0 ? "ok" : "draft";
        writeRunNoteStatus(contents, status);
        result.status = status;
    }
    return result;
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const result = checkKnowledgeNotes(args.paths, { root: args.root, markDraft: args.markDraft });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exit(result.ok ? 0 : 1);
}

const invokedDirectly =
    process.argv[1] &&
    import.meta.url === (await import("node:url")).pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
    try {
        main();
    } catch (err) {
        // `resolveKnowledgeRoot` rejecting a relative `knowledge_root` is a
        // user-configuration error, not a crash: it earns the one exact line
        // the store contract fixes, never a stack trace.
        process.stderr.write(`Error: ${err?.message ?? err}\n`);
        process.exit(2);
    }
}
