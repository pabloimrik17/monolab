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
            "openspec/**",
            ".claude/**",
            ".opencode/**",
            "**/CHANGELOG.md",
        ],
    },
    eslint.configs.recommended,
    tseslint.configs.recommended
);
