/**
 * Shared primitives for the run-knowledge store (D1-D8 of the
 * add-run-knowledge-base design): root resolution, the package slug rule,
 * an Obsidian-safe frontmatter codec (scalars and string lists only),
 * slot/marker helpers, the `research.md` section parser (both heading
 * contracts), and range algebra over `lib/semver.mjs`.
 */

import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import { normalizePackageName } from "./cache.mjs";
import { compare } from "./semver.mjs";

/** D1: default root, `userConfig.knowledge_root` override, `~` expansion. */
export function resolveKnowledgeRoot(env = process.env) {
    const override = env.knowledge_root ?? env.KNOWLEDGE_ROOT ?? "";
    if (!override) {
        return join(homedir(), ".claude", "experiments", "knowledge");
    }
    if (override.startsWith("~")) {
        return join(homedir(), override.slice(1).replace(/^[/\\]/, ""));
    }
    if (!isAbsolute(override)) {
        throw new Error("knowledge_root must be absolute or ~-prefixed.");
    }
    return override;
}

/** D2: `@scope/name` -> `@scope__name`, identical to the changelog cache. */
export const pkgSlug = normalizePackageName;

/**
 * D4's `changeset.status` enum. Six values: the original five plus
 * `verification-failed` — the changeset gate opened and was approved, the
 * edits were applied, and the orchestrator's on-disk re-check found the
 * changed set didn't match the approved changeset. Every script that reads
 * `outcome.projects[].changeset.status` passes it through verbatim; none
 * filters against a narrower set.
 */
export const CHANGESET_STATUSES = [
    "approved",
    "rejected",
    "skipped",
    "not-run",
    "verification-failed",
    "unknown",
];

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parseFrontmatter(content) {
    const m = FRONTMATTER_RE.exec(content);
    if (!m) return { data: {}, body: content };
    const data = {};
    for (const line of m[1].split(/\r?\n/)) {
        if (!line.trim()) continue;
        const kv = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line);
        if (!kv) continue;
        data[kv[1]] = parseYamlValue(kv[2]);
    }
    return { data, body: m[2] };
}

export function serializeFrontmatter(data, body = "") {
    const lines = ["---"];
    for (const [key, value] of Object.entries(data)) {
        lines.push(`${key}: ${serializeYamlValue(value)}`);
    }
    lines.push("---");
    return `${lines.join("\n")}\n${body}`;
}

function parseYamlValue(raw) {
    const trimmed = raw.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        const inner = trimmed.slice(1, -1).trim();
        return inner === "" ? [] : splitTopLevelCommas(inner).map(parseScalar);
    }
    return parseScalar(trimmed);
}

function splitTopLevelCommas(s) {
    const parts = [];
    let cur = "";
    let quote = null;
    for (const ch of s) {
        if (quote) {
            cur += ch;
            if (ch === quote) quote = null;
        } else if (ch === '"' || ch === "'") {
            quote = ch;
            cur += ch;
        } else if (ch === ",") {
            parts.push(cur);
            cur = "";
        } else {
            cur += ch;
        }
    }
    if (cur.trim() !== "") parts.push(cur);
    return parts.map((p) => p.trim());
}

function parseScalar(raw) {
    const t = raw.trim();
    if (t === "" || t === "null" || t === "~") return null;
    if (t === "true") return true;
    if (t === "false") return false;
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
        return t.slice(1, -1);
    }
    return t;
}

function serializeYamlValue(value) {
    if (Array.isArray(value)) return `[${value.map(serializeScalar).join(", ")}]`;
    return serializeScalar(value);
}

function serializeScalar(value) {
    if (value === null || value === undefined) return "null";
    if (typeof value === "boolean") return value ? "true" : "false";
    const s = String(value);
    return needsQuoting(s) ? JSON.stringify(s) : s;
}

const RESERVED_SCALARS = new Set(["true", "false", "null", "~"]);

// Quoting is deliberately conservative: it only has to round-trip through
// our own parser above, not satisfy a full YAML grammar.
function needsQuoting(s) {
    if (s === "") return true;
    if (RESERVED_SCALARS.has(s)) return true;
    if (/^-?\d+(\.\d+)?$/.test(s)) return true;
    if (/^\s|\s$/.test(s)) return true;
    if (s.includes("..")) return true;
    return /: |[\n#[\]{}",&*|>'%!@]/.test(s);
}

export function emptySlot(name) {
    return `<!-- slot:${name} -->\n<!-- /slot -->`;
}

const SLOT_RE = /<!-- slot:(\w+) -->\n?([\s\S]*?)<!-- \/slot -->/g;

/** Every slot pair in `content`, in document order. */
export function findSlots(content) {
    const slots = [];
    let m;
    SLOT_RE.lastIndex = 0;
    while ((m = SLOT_RE.exec(content))) {
        slots.push({ name: m[1], content: m[2], start: m.index, end: SLOT_RE.lastIndex });
    }
    return slots;
}

/** A slot is unfilled if it is blank or still carries a pre-fill sentinel. */
export function isSlotUnfilled(slotContent) {
    return (
        slotContent.trim() === "" ||
        slotContent.includes("<!-- distill -->") ||
        slotContent.includes("<!-- no-research -->")
    );
}

// Proves nothing outside a slot changed between the script's write and a
// later re-read: slot content is blanked before hashing, and the marker
// itself sits after the hashed region, at the very end of the file.
export function blankSlots(content) {
    return content.replace(
        /<!-- slot:(\w+) -->\n?[\s\S]*?<!-- \/slot -->/g,
        (_all, name) => `<!-- slot:${name} -->\n<!-- /slot -->`,
    );
}

export function computePreimageHash(content) {
    return createHash("sha256").update(blankSlots(content)).digest("hex");
}

const PREIMAGE_MARKER_RE = /\n?<!-- knowledge:preimage ([0-9a-f]{64}) -->\n(?![\s\S])/;

export function stripPreimageMarker(content) {
    return content.replace(PREIMAGE_MARKER_RE, "\n");
}

export function appendPreimageMarker(content) {
    const trimmed = content.replace(/\n+$/, "\n");
    return `${trimmed}<!-- knowledge:preimage ${computePreimageHash(trimmed)} -->\n`;
}

/** `{ ok, reason }` — false when the marker is missing or content outside a slot changed. */
export function verifyPreimage(content) {
    const m = PREIMAGE_MARKER_RE.exec(content);
    if (!m) return { ok: false, reason: "missing preimage marker" };
    const withoutMarker = content.slice(0, m.index + 1); // keep the newline the marker replaced
    const expected = computePreimageHash(withoutMarker);
    return expected === m[1]
        ? { ok: true, reason: null }
        : { ok: false, reason: "content outside a slot changed since the script wrote it" };
}

export function buildRunMarker({ runId, level, mode, synthetic, supersededBy }) {
    return `<!-- run:${runId} level:${level} mode:${mode} synthetic:${synthetic ? "true" : "false"} supersededBy:${supersededBy ?? ""} -->`;
}

const MARKER_RE =
    /^<!-- run:(\S+) level:(\S+) mode:(\S+) synthetic:(true|false) supersededBy:(\S*) -->$/;

export function parseRunMarker(line) {
    const m = MARKER_RE.exec(line.trim());
    if (!m) return null;
    return {
        runId: m[1],
        level: m[2],
        mode: m[3],
        synthetic: m[4] === "true",
        supersededBy: m[5] || null,
    };
}

/** First index at or after `fromIndex` holding a non-blank line, or -1. */
export function nextNonBlankIndex(lines, fromIndex) {
    let i = fromIndex;
    while (i < lines.length && lines[i].trim() === "") i++;
    return i < lines.length ? i : -1;
}

/** The `<!-- run:… -->` marker following a `## <from> → <to>` heading, a blank line apart per the note templates. */
export function findSectionMarker(lines, headingIndex) {
    const markerIdx = nextNonBlankIndex(lines, headingIndex + 1);
    if (markerIdx === -1) return null;
    const marker = parseRunMarker(lines[markerIdx]);
    return marker ? { index: markerIdx, marker } : null;
}

/** Replace `supersededBy:<old>` in a marker line, keyed by exact runId. */
export function withSupersededBy(markerLine, supersededBy) {
    return markerLine.replace(/supersededBy:\S*/, `supersededBy:${supersededBy ?? ""}`);
}

// Accepts every heading contract in play: legacy (`### Workarounds resolved`),
// cross-project universal-only (`### Workarounds resolved (universal)`), and
// the D8 single-project split (adds the `(this project)` twin of each).
const PACKAGE_HEADING_RE = /^## (.+?)\s*\(([^()]+)\)\s*$/;
const H3_RE = /^### (.+?)\s*$/;
const SOURCE_LINE_RE = /^source:\s*prior-run\s+(\S+)/;
const COPIED_UNIVERSAL_LABEL_RE =
    /^\*\*((?:Workarounds resolved|Improvements applicable) \(universal\))\*\*$/;

export function parseResearchPackages(content) {
    const lines = content.split("\n");
    const raw = [];
    let current = null;
    for (const line of lines) {
        const m = PACKAGE_HEADING_RE.exec(line);
        if (m) {
            const [from, to] = splitArrow(m[2]);
            current = { name: m[1].trim(), from, to, lines: [] };
            raw.push(current);
        } else if (current) {
            current.lines.push(line);
        }
    }
    return raw.map(finalizeResearchPackage);
}

function splitArrow(range) {
    const m = /^(.+?)\s*(?:→|->)\s*(.+)$/.exec(range.trim());
    return m ? [m[1].trim(), m[2].trim()] : [range.trim(), range.trim()];
}

function finalizeResearchPackage(pkg) {
    let lines = pkg.lines;
    let i = 0;
    while (i < lines.length && lines[i].trim() === "") i++;
    const sourceMatch = i < lines.length ? SOURCE_LINE_RE.exec(lines[i].trim()) : null;
    const sourceRunId = sourceMatch ? sourceMatch[1] : null;
    if (sourceMatch) lines = lines.slice(i + 1);

    const sections = {};
    let key = null;
    let buf = [];
    const flush = () => {
        if (key !== null) sections[key] = buf.join("\n").trim();
    };
    for (const line of lines) {
        const heading =
            H3_RE.exec(line) ?? (sourceRunId ? COPIED_UNIVERSAL_LABEL_RE.exec(line.trim()) : null);
        if (heading) {
            flush();
            key = heading[1].trim();
            buf = [];
        } else if (key !== null) {
            buf.push(line);
        }
    }
    flush();

    const keys = Object.keys(sections);
    const hasUniversal = keys.some((k) => k.endsWith("(universal)"));
    const hasThisProject = keys.some((k) => k.endsWith("(this project)"));
    const format =
        hasUniversal && hasThisProject ? "split" : hasUniversal ? "universal-only" : "legacy";

    return { name: pkg.name, from: pkg.from, to: pkg.to, sourceRunId, format, sections };
}

/**
 * The hub's `### Universal` slot content for one research package section,
 * or `null` when the section predates the universal/this-project split and
 * must instead be distilled by the subagent (`<!-- distill -->`).
 */
export function universalContent(pkgSection) {
    if (pkgSection.format === "legacy") return null;
    const workarounds = pkgSection.sections["Workarounds resolved (universal)"] ?? "_no findings_";
    const improvements =
        pkgSection.sections["Improvements applicable (universal)"] ?? "_no findings_";
    return [
        "**Workarounds resolved (universal)**",
        "",
        workarounds,
        "",
        "**Improvements applicable (universal)**",
        "",
        improvements,
    ].join("\n");
}

// bucketKey is not itself stored in _meta.json; the copy step and the index
// builder both recover it from groupId.
export function bucketKeyFromGroupId(groupId) {
    return groupId.replace(/-\d+$/, "");
}

/** True when the half-open ranges (a.from, a.to] and (b.from, b.to] overlap. */
export function rangesOverlap(a, b) {
    return compare(a.from, b.to) < 0 && compare(b.from, a.to) < 0;
}

/**
 * The sub-range(s) of `current` not covered by `prior`, half-open-interval
 * subtraction, formatted `(from, to]`; `null` when nothing is left over.
 */
export function computeDelta(prior, current) {
    const segments = [];
    if (compare(prior.from, current.from) > 0) {
        const leftTo = compare(prior.from, current.to) < 0 ? prior.from : current.to;
        segments.push([current.from, leftTo]);
    }
    if (compare(prior.to, current.to) < 0) {
        const rightFrom = compare(prior.to, current.from) > 0 ? prior.to : current.from;
        segments.push([rightFrom, current.to]);
    }
    if (segments.length === 0) return null;
    return segments.map(([from, to]) => `(${from}, ${to}]`).join(", ");
}

/** D6: classify a candidate `prior` range against the `current` scan range. */
export function classifyRange(prior, current) {
    if (compare(prior.from, current.from) === 0 && compare(prior.to, current.to) === 0) {
        return { class: "exact", delta: null };
    }
    if (compare(prior.to, current.from) <= 0) {
        return { class: "prior", delta: null };
    }
    if (rangesOverlap(prior, current)) {
        return { class: "overlap", delta: computeDelta(prior, current) };
    }
    return null;
}
