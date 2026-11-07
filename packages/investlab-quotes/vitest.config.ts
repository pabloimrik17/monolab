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
                thresholds: coverageThresholds({
                    lines: 80,
                    branches: 80,
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
