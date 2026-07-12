/**
 * Engine release-note sourcing (npm-changelog "Engine release-note
 * retrieval"): canonical repos, version enumeration, and release-tag
 * formats per engine. `node`/`deno`/`bun` are always engines; `npm`,
 * `pnpm`, `yarn` are engines only when the caller passes --engine.
 */

import { isStable, sortAscending } from "./semver.mjs";

export const ENGINES = {
    node: {
        repo: { owner: "nodejs", repo: "node" },
        tagTemplates: ["v{version}"],
        versionSource: "node-dist",
    },
    pnpm: {
        repo: { owner: "pnpm", repo: "pnpm" },
        tagTemplates: ["v{version}"],
        versionSource: "npm:pnpm",
    },
    npm: {
        repo: { owner: "npm", repo: "cli" },
        tagTemplates: ["v{version}"],
        versionSource: "npm:npm",
    },
    yarn: {
        repo: { owner: "yarnpkg", repo: "berry" },
        tagTemplates: ["@yarnpkg/cli/{version}", "v{version}"],
        versionSource: "npm:@yarnpkg/cli",
    },
    deno: {
        repo: { owner: "denoland", repo: "deno" },
        tagTemplates: ["v{version}"],
        versionSource: "npm:deno",
    },
    bun: {
        repo: { owner: "oven-sh", repo: "bun" },
        tagTemplates: ["bun-v{version}"],
        versionSource: "npm:bun",
    },
};

export const ALWAYS_ENGINE = new Set(["node", "deno", "bun"]);

export function isEngineRequest(name, engineFlag) {
    if (ALWAYS_ENGINE.has(name)) return true;
    return engineFlag && Object.hasOwn(ENGINES, name);
}

/** Stable Node versions from the dist index (newest-first in source). */
export function nodeVersionsFromDistIndex(indexJson) {
    return sortAscending(
        indexJson
            .map((entry) => String(entry.version).replace(/^v/, ""))
            .filter(isStable),
    );
}
