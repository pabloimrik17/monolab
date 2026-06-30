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
    // Type-aware linting (project service; excludes out-of-project config files).
    {
        files: ["**/*.{ts,tsx,mts,cts}"],
        ignores: [
            "**/*.config.{ts,mts,cts}",
            "eslint.config.ts",
            "**/*.test-d.ts",
            "**/*.setup.{ts,mts,cts}",
        ],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            "@typescript-eslint/no-unnecessary-type-assertion": "warn",
        },
    },
    // Files not covered by a build tsconfig (JS, configs, tests, setup, type-tests):
    // disable the type-checked project service so they don't trip the parser.
    {
        files: [
            "**/*.{js,cjs,mjs}",
            "**/*.config.{ts,mts,cts}",
            "eslint.config.ts",
            "**/*.test.{ts,tsx,mts,cts}",
            "**/*.spec.{ts,tsx,mts,cts}",
            "**/*.integration.{ts,tsx}",
            "**/*.test-d.ts",
            "**/*.setup.{ts,mts,cts}",
        ],
        extends: [tseslint.configs.disableTypeChecked],
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
            "preserve-caught-error": "warn",
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
