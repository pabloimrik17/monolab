/** Shared parsing, marker, path, and range helpers for the knowledge store. */

import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import { normalizePackageName } from "./cache.mjs";
import { compare } from "./semver.mjs";

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

export const pkgSlug = normalizePackageName;

// Keep this aligned with `outcome.projects[].changeset.status`.
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

// This codec only needs to round-trip through `parseFrontmatter`.
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

export function findSlots(content) {
    const slots = [];
    let m;
    SLOT_RE.lastIndex = 0;
    while ((m = SLOT_RE.exec(content))) {
        slots.push({ name: m[1], content: m[2], start: m.index, end: SLOT_RE.lastIndex });
    }
    return slots;
}

export function isSlotUnfilled(slotContent) {
    return (
        slotContent.trim() === "" ||
        slotContent.includes("<!-- distill -->") ||
        slotContent.includes("<!-- no-research -->")
    );
}

// Hash only script-owned content; slot bodies remain model-owned.
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

export function nextNonBlankIndex(lines, fromIndex) {
    let i = fromIndex;
    while (i < lines.length && lines[i].trim() === "") i++;
    return i < lines.length ? i : -1;
}

export function findSectionMarker(lines, headingIndex) {
    const markerIdx = nextNonBlankIndex(lines, headingIndex + 1);
    if (markerIdx === -1) return null;
    const marker = parseRunMarker(lines[markerIdx]);
    return marker ? { index: markerIdx, marker } : null;
}

export function withSupersededBy(markerLine, supersededBy) {
    return markerLine.replace(/supersededBy:\S*/, `supersededBy:${supersededBy ?? ""}`);
}

// Supports legacy, universal-only, and universal/project heading contracts.
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

/** Returns universal hub content, or `null` when legacy research needs distillation. */
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

// Group metadata stores `groupId`, not `bucketKey`.
export function bucketKeyFromGroupId(groupId) {
    return groupId.replace(/-\d+$/, "");
}

export function rangesOverlap(a, b) {
    return compare(a.from, b.to) < 0 && compare(b.from, a.to) < 0;
}

/** Returns the half-open portion of `current` not covered by `prior`. */
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
