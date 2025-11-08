// @ts-check
import eslint from "@eslint/js";
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
            ".claude/**",
            ".opencode/**",
            "**/CHANGELOG.md",
        ],
    },
    eslint.configs.recommended,
    tseslint.configs.recommended,
    {
        files: ["**/*.test-d.ts"],
        rules: {
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/no-empty-object-type": "off",
        },
    }
);
