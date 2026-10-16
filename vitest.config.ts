import { defineConfig } from "vitest/config";

/**
 * Config for `vitest` run from the repo root (`pnpm test:ui`): each package's
 * vitest.config.ts becomes a project with its own settings. Nx runs those
 * configs directly instead.
 *
 * Root test options never reach file-based projects; shared settings live in
 * @m0n0lab/vitest-config, which each project merges itself.
 */
export default defineConfig({
    test: {
        projects: ["packages/*/vitest.config.ts"],
    },
});
