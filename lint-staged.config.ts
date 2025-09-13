import type { Configuration } from "lint-staged";
import { relative } from "path";

// This limit is only for lint-staged files, not for the whole project
const ESLINT_MAX_WARNINGS = 50;
const KNIP_MAX_ISSUES = 50;
// Number of files to process at once, this is to avoid limitations on Windows max command line length
const MAX_FILES = 50;

function toRelativePaths(absoluteFilenames: string[]): string[] {
    const workspaceRoot = process.cwd();
    return absoluteFilenames.map((filename) =>
        relative(workspaceRoot, filename)
    );
}

export default {
    "**/*": [
        // the callback function is used to avoid files in the commit being
        // passed to knip
        (filenames) => {
            const relativeFiles = toRelativePaths(filenames);

            return filenames.length > MAX_FILES
                ? `nx affected --files=${relativeFiles} -t lint:eslint:fix --max-warnings ${ESLINT_MAX_WARNINGS}`
                : `nx affected --files=${relativeFiles} -t lint:eslint:fix --max-warnings ${ESLINT_MAX_WARNINGS} ${filenames.join(
                      " "
                  )}`;
        },
        (filenames) =>
            filenames.length > MAX_FILES
                ? "prettier --write --ignore-unknown"
                : `prettier --write --ignore-unknown ${filenames.join(" ")}`,
        () => `knip --max-issues ${KNIP_MAX_ISSUES}`,
    ],
    "*.md": (filenames) =>
        filenames.length > MAX_FILES
            ? "markdownlint --fix"
            : `markdownlint --fix ${filenames.join(" ")}`,
    "*.css": (filenames) =>
        filenames.length > MAX_FILES
            ? "stylelint --fix"
            : `stylelint --fix ${filenames.join(" ")}`,
    "*.scss": (filenames) =>
        filenames.length > MAX_FILES
            ? "stylelint --fix"
            : `stylelint --fix ${filenames.join(" ")}`,
} satisfies Configuration;
