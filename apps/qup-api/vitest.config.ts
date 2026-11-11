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
                    "**/*.integration.{ts,tsx}",
                    "**/*.integration-platform.{ts,tsx}",
                    "**/*.harness.ts",
                    "**/harness/**",
                    "**/testing/**",
                    "**/vitest-*setup*.ts",
                    "**/*.d.ts",
                ],
                // Floors from the measurement of 2026-11-11 rounded down to a multiple of 5 (lines 93.63,
                // branches 85.5, functions 100, statements 93.8); ADR 0008 (docs/adr/0008-test-policy.md). Never lower them.
                thresholds: coverageThresholds({
                    lines: 90,
                    branches: 85,
                    functions: 100,
                    statements: 90,
                }),
            },
            projects: [
                {
                    test: {
                        name: "integration-platform",
                        include: ["src/**/*.integration-platform.ts"],
                    },
                },
            ],
        },
    }),
);
