import { defineConfig } from "vitest/config";

/**
 * Vitest root configuration for MonoLab monorepo
 *
 * This configuration uses the projects feature to auto-discover per-package
 * vitest.config.ts files. Each package has its own isolated configuration
 * to prevent test result file overwrites when Nx runs tests sequentially.
 *
 * Shared test configuration is defined in each package's vitest.config.ts:
 * - Automatic cleanup: clearMocks, restoreMocks, unstubEnvs, unstubGlobals
 * - Concurrency: maxConcurrency set to 10 for parallel test execution
 * - JUnit XML reporter for Codecov Test Analytics
 * - Coverage configuration with v8 provider and lcov reporter
 *
 * Each package defines test projects for:
 * - Unit tests (*.test.ts, *.test.tsx)
 * - Integration tests (*.integration.ts)
 * - Browser tests (*.browser.test.ts, *.browser.test.tsx) - React packages only
 * - Type tests (*.test-d.ts) - Packages with exported types
 *
 * @see https://vitest.dev/guide/workspace
 * @see https://vitest.dev/guide/migration.html#workspace-is-replaced-with-projects
 * @see https://docs.codecov.com/docs/test-analytics
 */
export default defineConfig({
    test: {
        // Auto-discover vitest.config.ts files in all packages
        projects: ["packages/*"],
        // Shared test configuration
        clearMocks: true,
        restoreMocks: true,
        unstubEnvs: true,
        unstubGlobals: true,
        maxConcurrency: 10,
    },
});
