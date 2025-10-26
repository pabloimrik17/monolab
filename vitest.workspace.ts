import { defineWorkspace } from "vitest/config";

/**
 * Vitest workspace configuration for MonoLab monorepo
 *
 * This configuration enables JUnit XML reporter for all packages to support
 * Codecov Test Analytics integration. Test results are uploaded to Codecov
 * to track test failures, identify flaky tests, and monitor performance metrics.
 *
 * @see https://vitest.dev/guide/workspace
 * @see https://docs.codecov.com/docs/test-analytics
 */
export default defineWorkspace([
    {
        test: {
            // Use both default and JUnit reporters
            // - default: Human-readable console output for development
            // - junit: XML output for Codecov Test Analytics
            reporters: ["default", "junit"],

            // Output JUnit XML to each package's root directory
            outputFile: {
                junit: "./test-results.junit.xml",
            },

            // Coverage configuration
            coverage: {
                provider: "v8",
                reporter: ["text", "json", "html", "lcov"],
                reportsDirectory: "./coverage",
            },
        },
    },
]);
