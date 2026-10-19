import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "lint-staged/config";

const ESLINT_MAX_WARNINGS = 40;

const MARKDOWN_FILES = /\.md$/;
const STYLE_FILES = /\.(?:css|scss)$/;
const FALLOW_FILES = /\.(?:ts|tsx|js|jsx|mjs|cjs|json|jsonc)$/;
const RENOVATE_FILES = /(?:^|\/)renovate\.json$/;

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

/** `command` once, without file arguments, when any staged file matches. */
function whenStaged(pattern: RegExp, command: string, filenames: readonly string[]): string[] {
    return filenames.some((filename) => pattern.test(toRelativePath(filename))) ? [command] : [];
}

export default defineConfig({
    // Steps run in order, so writers never overlap; an array a step returns runs in parallel.
    "**/*": [
        // nx affected requires CSV format, cannot use simple string command
        (filenames: readonly string[]): string =>
            `nx affected --files=${filenames.map(toRelativePath).join(",")} -t lint:eslint:fix -- --max-warnings=${ESLINT_MAX_WARNINGS}`,
        // After ESLint: its unused-import removal leaves code that oxfmt must re-format.
        "oxfmt --no-error-on-unmatched-pattern",
        // Each fixer writes only its own file type, so they can run together.
        (filenames: readonly string[]): string[] => [
            ...forStaged(MARKDOWN_FILES, "markdownlint --fix", filenames),
            ...forStaged(STYLE_FILES, "stylelint --fix", filenames),
        ],
        (filenames: readonly string[]): string[] => [
            "pnpm run lint:knip",
            // New-only ratchet vs the merge-base; the full-repo lint:fallow gate stays in push CI.
            ...whenStaged(FALLOW_FILES, "fallow audit", filenames),
            ...forStaged(
                RENOVATE_FILES,
                "pnpm dlx --package renovate@43.220.0 renovate-config-validator --strict",
                filenames,
            ),
        ],
    ],
});
