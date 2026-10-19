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
                exclude: ["**/*.test-d.ts", "**/*.integration.ts", "**/testing/**"],
                // Below the 80 target of ADR 0008 (docs/adr/0008-test-policy.md): these floors are the CI
                // measurement of 2026-10-18 rounded down to a multiple of 5 (lines 61.11, branches 100, functions 50,
                // statements 61.11). Never lower them. Whoever adds tests here re-measures with `test:coverage` and
                // raises every metric that passed its next multiple of 5, until each one reaches 80.
                thresholds: coverageThresholds({
                    lines: 60,
                    branches: 80,
                    functions: 50,
                    statements: 60,
                }),
            },
        },
    }),
);
