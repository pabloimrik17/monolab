import type { Configuration } from "lint-staged";
import { relative } from "path";

const ESLINT_MAX_WARNINGS = 40;
const KNIP_MAX_ISSUES = 40;

function toRelativePaths(absoluteFilenames: string[]): string[] {
    const workspaceRoot = process.env.NX_WORKSPACE_ROOT ?? process.cwd();
    return absoluteFilenames.map((filename) =>
        relative(workspaceRoot, filename).replace(/\\/g, "/")
    );
}

export default {
    "**/*": [
        // nx affected requires CSV format, cannot use simple string command
        (filenames) => {
            const relativeFiles = toRelativePaths(filenames);
            const filesCsv = relativeFiles.join(",");

            return `nx affected --files=${filesCsv} -t lint:eslint:fix -- --max-warnings=${ESLINT_MAX_WARNINGS}`;
        },
        // lint-staged handles file chunking automatically
        "prettier --write --ignore-unknown",
        // knip runs on the whole project, not per file
        () => `knip --max-issues ${KNIP_MAX_ISSUES}`,
    ],
    "*.md": "markdownlint --fix",
    "*.css": "stylelint --fix",
    "*.scss": "stylelint --fix",
} satisfies Configuration;
