// @ts-check
import eslint from "@eslint/js";
import regexpPlugin from "eslint-plugin-regexp";
import globals from "globals";
import tseslint from "typescript-eslint";

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
            "**/.vinxi/**",
            "**/.output/**",
            "**/.nx/**",
            "**/.svelte-kit/**",
            "**/.vercel/**",
            "**/.expect/**",
        ],
    },
    eslint.configs.recommended,
    tseslint.configs.recommended,
    regexpPlugin.configs.recommended,
    {
        files: ["**/*.cjs", "**/*.mjs", "**/*.config.{js,ts,cjs,mjs}"],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
    {
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    enableAutofixRemoval: { imports: true },
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                },
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
