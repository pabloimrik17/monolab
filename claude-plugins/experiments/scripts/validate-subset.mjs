#!/usr/bin/env node
/**
 * validate-subset — deterministic pick-subset parsing for the deep gates.
 * Partitions the user's free-form selection into bump matches (exact
 * match against bump-set package names) and improvement matches
 * (substring match against dossier improvement bullet titles), flagging
 * tokens that match neither so the caller can re-prompt instead of
 * silently dropping input. The caller owns the semantics of a match
 * (the deep gates treat matched tokens as the items to APPLY).
 *
 * Usage:
 *   validate-subset.mjs --input <file.json>
 *   echo '{...}' | validate-subset.mjs
 *
 * Input JSON:
 *   { selection: string[] | string, bumpNames: string[],
 *     improvementTitles: string[] }
 *   A string selection is split on commas outside double quotes; quoted
 *   tokens keep embedded commas.
 *
 * Output JSON:
 *   { ok, bumpMatches: string[], improvementMatches:
 *       [{ token, matchedTitles: string[] }], unmatched: string[] }
 * `ok` is false when any token is unmatched.
 * Exit codes: 0 = every token matched; 1 = unmatched tokens; 2 = usage.
 */

import { readFileSync } from "node:fs";

function fail(message) {
    process.stderr.write(`validate-subset: ${message}\n`);
    process.exit(2);
}

/** Split on commas, honoring double-quoted tokens. */
export function tokenizeSelection(selection) {
    if (Array.isArray(selection)) {
        return selection.map((s) => String(s).trim()).filter(Boolean);
    }
    const tokens = [];
    let current = "";
    let inQuotes = false;
    for (const ch of String(selection)) {
        if (ch === '"') inQuotes = !inQuotes;
        else if (ch === "," && !inQuotes) {
            tokens.push(current.trim());
            current = "";
        } else current += ch;
    }
    tokens.push(current.trim());
    return tokens.filter(Boolean);
}

export function validateSubset({ selection, bumpNames, improvementTitles }) {
    const tokens = tokenizeSelection(selection ?? []);
    const bumpMatches = [];
    const improvementMatches = [];
    const unmatched = [];
    for (const token of tokens) {
        if ((bumpNames ?? []).includes(token)) {
            bumpMatches.push(token);
            continue;
        }
        const matchedTitles = (improvementTitles ?? []).filter((title) =>
            title.toLowerCase().includes(token.toLowerCase()),
        );
        if (matchedTitles.length > 0) {
            improvementMatches.push({ token, matchedTitles });
        } else {
            unmatched.push(token);
        }
    }
    return {
        ok: unmatched.length === 0,
        bumpMatches,
        improvementMatches,
        unmatched,
    };
}

function main() {
    const argv = process.argv.slice(2);
    let inputPath = null;
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === "--input") inputPath = argv[++i];
        else fail(`unknown argument "${argv[i]}"`);
    }
    let raw;
    try {
        raw = inputPath
            ? readFileSync(inputPath, "utf8")
            : readFileSync(0, "utf8");
    } catch (err) {
        fail(`cannot read input: ${err.message}`);
    }
    let input;
    try {
        input = JSON.parse(raw);
    } catch (err) {
        fail(`input is not valid JSON: ${err.message}`);
    }
    const result = validateSubset(input);
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    process.exit(result.ok ? 0 : 1);
}

const invokedDirectly =
    process.argv[1] &&
    import.meta.url === (await import("node:url")).pathToFileURL(
        process.argv[1],
    ).href;
if (invokedDirectly) main();
