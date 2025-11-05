import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

/**
 * Vitest root configuration for MonoLab monorepo
 *
 * This configuration uses the projects feature to auto-discover per-package
 * vitest.config.ts files. Each package has its own isolated configuration
 * to prevent test result file overwrites when Nx runs tests sequentially.
 *
 * Root-level shared configuration (inherited by all packages):
 * - Automatic cleanup: clearMocks, restoreMocks, unstubEnvs, unstubGlobals
 * - Concurrency: maxConcurrency set to 10 for parallel test execution
 * - Browser configuration: Playwright provider (enabled per test via --browser.enabled flag)
 *
 * Package-specific configuration (defined in each package's vitest.config.ts):
 * - Test file includes: *.{test,spec}.{ts,tsx}, *.browser.test.{ts,tsx}, *.integration.ts
 * - JUnit XML reporter for Codecov Test Analytics
 * - Coverage configuration with v8 provider and lcov reporter
 * - Environment: jsdom by default
 * - Browser tests: Enabled via CLI flag (--browser.enabled=true) for *.browser.test.tsx files
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
        // Browser configuration (inherited by projects that need it)
        browser: {
            enabled: false,
            provider: playwright({
                launch: {
                    headless: true,
                },
            }),
            instances: [
                {
                    browser: "chromium",
                },
            ],
        },
    },
});
