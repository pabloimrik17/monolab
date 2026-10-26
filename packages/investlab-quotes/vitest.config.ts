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
                // Below the 80 target of ADR 0008 (docs/adr/0008-test-policy.md): these floors are the CI
                // measurement of 2026-10-18 rounded down to a multiple of 5 (lines 85.25, branches 73.58, functions 85.24,
                // statements 85.11). Never lower them. Whoever adds tests here re-measures with `test:coverage` and
                // raises every metric that passed its next multiple of 5, until each one reaches 80.
                thresholds: coverageThresholds({
                    lines: 80,
                    branches: 70,
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
                        globalSetup: ["src/application/server/vitest-integration-global-setup.ts"],
                        // Each file takes its own Redis logical database and its own Finnhub fake
                        setupFiles: ["src/application/server/vitest-integration-setup.ts"],
                        // Container start-up (image pull) is slow on a cold machine
                        hookTimeout: 120_000,
                    },
                },
                {
                    test: {
                        name: "integration:client",
                        include: ["src/application/client/**/*.integration.ts"],
                        setupFiles: ["src/application/client/vitest-integration-setup.ts"],
                    },
                },
            ],
        },
    }),
);
