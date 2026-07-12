/**
 * GitHub access for the fetch-changelog executable. All network goes through
 * an injectable `http(url, init) → { status, body }` transport so tests run
 * offline. The releases API prefers the `gh` CLI (reuses its auth) and falls
 * back to plain fetch with an optional GITHUB_TOKEN.
 */

import { execFileSync } from "node:child_process";

export async function defaultHttp(url, init = {}) {
    try {
        const res = await fetch(url, {
            redirect: "follow",
            signal: AbortSignal.timeout(30_000),
            ...init,
        });
        return { status: res.status, body: await res.text() };
    } catch {
        return { status: 0, body: "" };
    }
}

let ghAvailable = null;
export function hasGhCli() {
    if (ghAvailable !== null) return ghAvailable;
    try {
        execFileSync("gh", ["--version"], { stdio: "ignore" });
        ghAvailable = true;
    } catch {
        ghAvailable = false;
    }
    return ghAvailable;
}

/**
 * GET a GitHub REST path. Returns { status, json } where json is the parsed
 * body (or null). Uses `gh api` when available, else the injected transport.
 */
export async function githubApi(path, { http = defaultHttp, useGh } = {}) {
    const shouldUseGh = useGh ?? hasGhCli();
    if (shouldUseGh) {
        try {
            const out = execFileSync("gh", ["api", path], {
                encoding: "utf8",
                stdio: ["ignore", "pipe", "pipe"],
                timeout: 30_000,
            });
            return { status: 200, json: JSON.parse(out) };
        } catch (err) {
            const stderr = String(err.stderr ?? "");
            if (/HTTP 404|Not Found/i.test(stderr)) {
                return { status: 404, json: null };
            }
            // gh errored (auth, rate limit, network) → try plain HTTP below
        }
    }
    const headers = { accept: "application/vnd.github+json" };
    if (process.env.GITHUB_TOKEN) {
        headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    const res = await http(`https://api.github.com${path}`, { headers });
    let json = null;
    try {
        json = JSON.parse(res.body);
    } catch {
        // non-JSON body → treated as error below
    }
    return { status: res.status, json };
}

export async function resolveDefaultBranch(owner, repo, opts) {
    const res = await githubApi(`/repos/${owner}/${repo}`, opts);
    if (res.status === 200 && res.json?.default_branch) {
        return res.json.default_branch;
    }
    return null;
}

export function rawFileUrl(owner, repo, branch, path) {
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
}

/**
 * Normalize an npm `repository` value to { owner, repo } for github.com
 * hosts only (npm-changelog Step 1). Returns null when not GitHub.
 */
export function parseGithubRepository(repository) {
    let url = typeof repository === "string" ? repository : repository?.url;
    if (!url) return null;
    if (/^git@[^:]+:/.test(url)) {
        url = url.replace(/^git@([^:]+):/, "ssh://git@$1/");
    }
    url = url.replace(/^git\+/, "");
    let parsed;
    try {
        parsed = new URL(url);
    } catch {
        return null;
    }
    if (parsed.hostname !== "github.com") return null;
    const segments = parsed.pathname
        .replace(/\.git$/, "")
        .split("/")
        .filter(Boolean);
    if (segments.length < 2) return null;
    return { owner: segments[0], repo: segments[1] };
}

/** Tag-format templates in npm-changelog probe order. */
export const TAG_TEMPLATES = [
    "v{version}",
    "{version}",
    "{package}@{version}",
    "{packageBasename}@{version}",
    "{package}-v{version}",
    "{packageBasename}-v{version}",
];

export function packageBasename(pkg) {
    return pkg.startsWith("@") ? pkg.split("/")[1] : pkg;
}

export function resolveTagTemplate(template, pkg, version) {
    return template
        .replace("{package}", pkg)
        .replace("{packageBasename}", packageBasename(pkg))
        .replace("{version}", version);
}

/**
 * Probe order for one version: cached format first (when set), then the
 * standard chain. Scoped monorepo variants only when isMonorepo; the
 * scope-stripped variants are skipped for unscoped packages (duplicates).
 */
export function probeTemplates(pkg, { isMonorepo, cachedFormat }) {
    const chain = ["v{version}", "{version}"];
    if (isMonorepo) {
        chain.push("{package}@{version}");
        if (pkg.startsWith("@")) chain.push("{packageBasename}@{version}");
        chain.push("{package}-v{version}");
        if (pkg.startsWith("@")) chain.push("{packageBasename}-v{version}");
    }
    if (cachedFormat && TAG_TEMPLATES.includes(cachedFormat)) {
        return [cachedFormat, ...chain.filter((t) => t !== cachedFormat)];
    }
    return chain;
}

export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
