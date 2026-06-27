// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import regexpPlugin from "eslint-plugin-regexp";

export default tseslint.config(
    {
        ignores: [
            "**/dist/**",
            "**/node_modules/**",
            "**/coverage/**",
            "**/html/**",
            "**/reports/**",
            "openspec/**",
            ".agent/**",
            ".agents/**",
            ".claude/**",
            ".codex/**",
            ".junie/**",
            ".opencode/**",
            "**/CHANGELOG.md",
            "**/CLAUDE.md",
            "**/AGENTS.md",
            "**/build/**",
            "**/.react-router/**",
        ],
    },
    eslint.configs.recommended,
    tseslint.configs.recommended,
    regexpPlugin.configs.recommended,
    {
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "error",
                { enableAutofixRemoval: { imports: true } },
            ],
        },
    },
    {
        files: ["**/*.test-d.ts"],
        rules: {
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/no-empty-object-type": "off",
        },
    },
);
