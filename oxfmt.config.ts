import { type OxfmtConfig } from "oxfmt";

export default {
    tabWidth: 4,
    singleAttributePerLine: true,
    ignorePatterns: [
        "dist",
        "out-tsc",
        "build",
        ".react-router",
        "coverage",
        ".nx",
        "openspec",
        ".agent",
        ".agents",
        ".claude",
        ".codex",
        ".junie",
        ".opencode",
        "CHANGELOG.md",
        // TODO: drop this entry once `markdownlint --config` accepts trailing commas in JSONC (run-con's strict JSON.parse rejects them); re-check on markdownlint-cli and formatter upgrades
        ".markdownlint.jsonc",
        "reports",
        "tsconfig.json",
    ],
    sortImports: {
        internalPattern: ["@m0n0lab/"],
        newlinesBetween: false,
        groups: [
            "value-builtin",
            "value-external",
            ["value-internal", "value-subpath"],
            ["value-parent", "value-sibling", "value-index"],
            "type-import",
            "unknown",
        ],
    },
    overrides: [
        {
            files: [".nvmrc"],
            options: {
                printWidth: 1,
            },
        },
    ],
} satisfies OxfmtConfig;
