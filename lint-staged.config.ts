import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "lint-staged/config";

const ESLINT_MAX_WARNINGS = 40;

const MARKDOWN_FILES = /\.(?:md|markdown)$/;
const FALLOW_FILES = /\.(?:ts|tsx|js|jsx|mjs|cjs|json|jsonc)$/;
const RENOVATE_FILES = /(?:^|\/)renovate\.json$/;
const WORKFLOW_FILES = /^\.github\/workflows\/[^/]+\.ya?ml$/;

function toRelativePath(filename: string): string {
    return path.relative(process.cwd(), filename).replaceAll("\\", "/");
}

/** lint-staged splits commands with string-argv, which has no escapes: quote with the character the path lacks. */
function quoted(filename: string): string {
    if (!existsSync(filename)) {
        throw new Error(
            String.raw`lint-staged passed a path that does not exist (it rewrites "\" in names): ${filename}`,
        );
    }
    const quote = filename.includes("'") ? '"' : "'";
    if (filename.includes(quote)) {
        throw new Error(`Cannot pass a path containing both ' and " to lint-staged: ${filename}`);
    }
    return `${quote}${filename}${quote}`;
}

/** `command` with the matching staged files appended as absolute paths (never read as options), or no task when none match. */
function forStaged(pattern: RegExp, command: string, filenames: readonly string[]): string[] {
    const matched = filenames.filter((filename) => pattern.test(toRelativePath(filename)));
    if (matched.length === 0) return [];
    return [`${command} ${matched.map(quoted).join(" ")}`];
}

/** nx affected takes the staged files as one CSV list, so it cannot be a plain string command. */
function affected(target: string, filenames: readonly string[]): string {
    return `nx affected --files=${filenames.map(toRelativePath).join(",")} -t ${target}`;
}

/** `command` once, without file arguments, when any staged file matches. */
function whenStaged(pattern: RegExp, command: string, filenames: readonly string[]): string[] {
    return filenames.some((filename) => pattern.test(toRelativePath(filename))) ? [command] : [];
}

export default defineConfig({
    // Steps run in order, so writers never overlap; an array a step returns runs in parallel.
    "**/*": [
        "oxfmt --no-error-on-unmatched-pattern",
        (filenames: readonly string[]): string =>
            `${affected("lint:eslint:fix", filenames)} -- --max-warnings=${ESLINT_MAX_WARNINGS}`,
        // Each fixer writes only its own file type, so they can run together.
        (filenames: readonly string[]): string[] => [
            ...forStaged(
                MARKDOWN_FILES,
                "markdownlint --config .markdownlint.jsonc --fix",
                filenames,
            ),
            affected("lint:stylelint:fix", filenames),
        ],
        "oxfmt --no-error-on-unmatched-pattern",
        (filenames: readonly string[]): string[] => [
            "pnpm run lint:knip",
            // New-only ratchet vs the merge-base; the full-repo lint:fallow gate stays in push CI.
            ...whenStaged(FALLOW_FILES, "fallow audit", filenames),
            ...forStaged(
                RENOVATE_FILES,
                "pnpx --package renovate@44.181.6 renovate-config-validator --strict",
                filenames,
            ),
            ...forStaged(WORKFLOW_FILES, "mise x -- zizmor --offline", filenames),
            // No shellcheck: actionlint 1.7.12 can deadlock on it (rhysd/actionlint#650); CI runs it.
            ...forStaged(WORKFLOW_FILES, "mise x -- actionlint -shellcheck= -pyflakes=", filenames),
        ],
    ],
});
