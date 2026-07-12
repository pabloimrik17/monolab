#!/usr/bin/env node
/**
 * check-source-untouched — the deterministic pre-gate check for the
 * per-project apply gate. The orchestrator snapshots the project tree
 * before spawning the apply teammate; after the teammate's turn-1
 * (reconnaissance + changeset.md, which lives OUTSIDE the project tree)
 * it verifies nothing in the project changed. Any drift aborts the
 * project before the human gate opens.
 *
 * Usage:
 *   check-source-untouched.mjs snapshot --dir <project> --out <baseline.json>
 *   check-source-untouched.mjs check    --dir <project> --baseline <baseline.json>
 *
 * Git projects: the baseline records `git status --porcelain=v1` plus a
 * content hash of every dirty/untracked file; `check` recomputes and
 * compares (catches new edits, new files, deletions, and edits to
 * already-dirty files). Non-git directories are rejected — the deep
 * flows operate on git repos.
 *
 * Output (check): JSON { ok, changed: [{ path, kind }] }.
 * Exit codes: snapshot → 0 written, 2 error.
 *             check    → 0 untouched, 1 modified, 2 error.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

function fail(message) {
    process.stderr.write(`check-source-untouched: ${message}\n`);
    process.exit(2);
}

function git(dir, args) {
    return execFileSync("git", ["-C", dir, ...args], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: 64 * 1024 * 1024,
    });
}

function isGitRepo(dir) {
    try {
        return git(dir, ["rev-parse", "--is-inside-work-tree"]).trim() === "true";
    } catch {
        return false;
    }
}

function hashFile(path) {
    try {
        return createHash("sha256").update(readFileSync(path)).digest("hex");
    } catch {
        return null; // deleted or unreadable
    }
}

/** { head, porcelain: [{ status, path }], dirtyHashes: { path: sha } } */
export function captureState(dir) {
    const head = git(dir, ["rev-parse", "HEAD"]).trim();
    const porcelainRaw = git(dir, ["status", "--porcelain=v1"]);
    const porcelain = porcelainRaw
        .split("\n")
        .filter(Boolean)
        .map((line) => ({
            status: line.slice(0, 2),
            path: line.slice(3).replace(/^"|"$/g, ""),
        }))
        .sort((a, b) => a.path.localeCompare(b.path));
    const dirtyHashes = {};
    for (const entry of porcelain) {
        const abs = join(dir, entry.path);
        if (existsSync(abs)) dirtyHashes[entry.path] = hashFile(abs);
    }
    return { head, porcelain, dirtyHashes };
}

export function diffStates(baseline, current) {
    const changed = [];
    if (baseline.head !== current.head) {
        changed.push({ path: "(HEAD)", kind: "commit-moved" });
    }
    const basePaths = new Map(baseline.porcelain.map((e) => [e.path, e.status]));
    const currPaths = new Map(current.porcelain.map((e) => [e.path, e.status]));
    for (const [path, status] of currPaths) {
        if (!basePaths.has(path)) {
            changed.push({ path, kind: `new (${status.trim() || "?"})` });
        } else if (basePaths.get(path) !== status) {
            changed.push({ path, kind: "status-changed" });
        } else if (
            baseline.dirtyHashes[path] !== undefined &&
            baseline.dirtyHashes[path] !== current.dirtyHashes[path]
        ) {
            changed.push({ path, kind: "content-changed" });
        }
    }
    for (const path of basePaths.keys()) {
        if (!currPaths.has(path)) {
            changed.push({ path, kind: "reverted-or-removed" });
        }
    }
    return changed;
}

function main() {
    const [mode, ...rest] = process.argv.slice(2);
    const args = {};
    for (let i = 0; i < rest.length; i++) {
        if (rest[i] === "--dir") args.dir = resolve(rest[++i]);
        else if (rest[i] === "--out") args.out = rest[++i];
        else if (rest[i] === "--baseline") args.baseline = rest[++i];
        else fail(`unknown argument "${rest[i]}"`);
    }
    if (!args.dir) fail("--dir <project> is required");
    if (!existsSync(args.dir)) fail(`no such directory: ${args.dir}`);
    if (!isGitRepo(args.dir)) {
        fail(`${args.dir} is not a git work tree (required for the pre-gate)`);
    }

    if (mode === "snapshot") {
        if (!args.out) fail("snapshot requires --out <baseline.json>");
        const state = captureState(args.dir);
        writeFileSync(args.out, JSON.stringify(state, null, 2) + "\n");
        process.stderr.write(
            `check-source-untouched: baseline written to ${args.out}\n`,
        );
        return;
    }
    if (mode === "check") {
        if (!args.baseline) fail("check requires --baseline <baseline.json>");
        let baseline;
        try {
            baseline = JSON.parse(readFileSync(args.baseline, "utf8"));
        } catch (err) {
            fail(`cannot read baseline: ${err.message}`);
        }
        const changed = diffStates(baseline, captureState(args.dir));
        const ok = changed.length === 0;
        process.stdout.write(JSON.stringify({ ok, changed }, null, 2) + "\n");
        process.exit(ok ? 0 : 1);
    }
    fail('mode must be "snapshot" or "check"');
}

const invokedDirectly =
    process.argv[1] &&
    import.meta.url === (await import("node:url")).pathToFileURL(
        process.argv[1],
    ).href;
if (invokedDirectly) main();
