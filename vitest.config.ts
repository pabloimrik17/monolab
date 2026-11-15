import { defineConfig } from "vitest/config";

/**
 * Config for `vitest` run from the repo root (`pnpm test:ui`): each app,
 * package and plugin vitest config becomes a project with its own settings. Nx runs those
 * configs directly instead.
 *
 * Root test options never reach file-based projects; shared settings live in
 * @m0n0lab/vitest-config, which each project merges itself.
 */
export default defineConfig({
    test: {
        projects: [
            "apps/*/vitest.config.ts",
            "packages/*/vitest.config.ts",
            "claude-plugins/*/vitest.config.mjs",
        ],
    },
});
