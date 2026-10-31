import { defineConfig, mergeConfig } from "vitest/config";
import { coverageThresholds, sharedConfig } from "@m0n0lab/vitest-config";

export default mergeConfig(
    sharedConfig,
    defineConfig({
        test: {
            include: ["**/*.{test,spec}.{ts,tsx}"],
            passWithNoTests: true,
            reporters: ["default", "junit"],
            outputFile: {
                junit: "./test-results.junit.xml",
            },
            coverage: {
                provider: "v8",
                reporter: ["lcov", "text", "json", "html"],
                reportsDirectory: "./coverage",
                include: ["src/**/*.{ts,tsx}"],
                exclude: [
                    "**/*.test-d.ts",
                    "**/*.integration.{ts,tsx}",
                    "**/*.integration-platform.{ts,tsx}",
                    "**/testing/**",
                    "**/vitest-*setup*.ts",
                    "**/.react-router/**",
                    "**/*.d.ts",
                ],
                // Below the 80 target of ADR 0008 (docs/adr/0008-test-policy.md): these floors are the
                // measurement after the clean-architecture-layout change moved the covered ticker store to the
                // quotes package, rounded down to a multiple of 5. Lowering them was a one-off exception to
                // ADR 0008's never-lower rule, recorded in that change's design §12. agentic-task-3ao3 (UI
                // harness) raises them. Whoever adds tests here re-measures with `test:coverage` and
                // raises every metric that passed its next multiple of 5, until each one reaches 80.
                thresholds: coverageThresholds({
                    lines: 45,
                    branches: 40,
                    functions: 40,
                    statements: 45,
                }),
            },
        },
    }),
);
