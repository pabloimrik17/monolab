import { defineConfig, mergeConfig } from "vitest/config";
import { coverageThresholds, sharedConfig } from "@m0n0lab/vitest-config";

export default mergeConfig(
    sharedConfig,
    defineConfig({
        test: {
            include: ["**/*.{test,spec}.ts"],
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
                    "**/testing/**",
                    "**/vitest-*setup*.ts",
                    "**/*.d.ts",
                ],
                // Below the 80 target of ADR 0008 (docs/adr/0008-test-policy.md): these floors are the CI
                // measurement of 2026-10-18 rounded down to a multiple of 5 (lines 9.54, branches 8.69, functions 12.85,
                // statements 9.29). Never lower them. Whoever adds tests here re-measures with `test:coverage` and
                // raises every metric that passed its next multiple of 5, until each one reaches 80.
                thresholds: coverageThresholds({
                    lines: 5,
                    branches: 5,
                    functions: 10,
                    statements: 5,
                }),
            },
        },
    }),
);
