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
                // Below ADR 0008's 80 target: a one-off exception to its never-lower rule, recorded in the
                // clean-architecture-layout design §12. agentic-task-3ao3 (UI harness) raises them. Whoever adds
                // tests here re-measures with `test:coverage` and raises every metric that passed its next
                // multiple of 5, until each one reaches 80.
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
