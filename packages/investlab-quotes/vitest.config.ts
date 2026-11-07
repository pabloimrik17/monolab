import { defineConfig, mergeConfig } from "vitest/config";
import { coverageThresholds, sharedConfig } from "@m0n0lab/vitest-config";

export default mergeConfig(
    sharedConfig,
    defineConfig({
        test: {
            reporters: ["default", "junit"],
            outputFile: {
                junit: "./test-results.junit.xml",
            },
            coverage: {
                provider: "v8",
                reporter: ["lcov", "text", "json", "html"],
                reportsDirectory: "./coverage",
                include: ["src/**/*.ts"],
                exclude: [
                    "**/*.test-d.ts",
                    "**/*.integration.ts",
                    "**/testing/**",
                    "**/*.builder.ts",
                    "**/vitest-integration-*.ts",
                ],
                // Below the 80 target of ADR 0008 (docs/adr/0008-test-policy.md): these floors are the
                // measurement of 2026-11-07 rounded down to a multiple of 5 (lines 91.2, branches 78.94, functions 88.65,
                // statements 90.77). Never lower them. Whoever adds tests here re-measures with `test:coverage` and
                // raises every metric that passed its next multiple of 5, until each one reaches 80.
                thresholds: coverageThresholds({
                    lines: 80,
                    branches: 75,
                    functions: 80,
                    statements: 80,
                }),
            },
            projects: [
                { test: { name: "unit", include: ["src/**/*.test.ts"] } },
                {
                    test: {
                        name: "integration:server",
                        include: ["src/application/server/**/*.integration.ts"],
                        globalSetup: ["src/testing/server/vitest-integration-global-setup.ts"],
                        // Each file takes its own Redis logical database and its own Finnhub fake
                        setupFiles: ["src/testing/server/vitest-integration-setup.ts"],
                        // Container start-up (image pull) is slow on a cold machine
                        hookTimeout: 120_000,
                    },
                },
                {
                    test: {
                        name: "integration:client",
                        include: ["src/application/client/**/*.integration.ts"],
                        setupFiles: ["src/testing/client/vitest-integration-setup.ts"],
                    },
                },
            ],
        },
    }),
);
