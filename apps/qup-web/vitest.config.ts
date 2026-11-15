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
                    "**/*.d.ts",
                ],
                // No tests yet, so every floor is 0 (ADR 0008, docs/adr/0008-test-policy.md). The first test
                // added here must measure with `test:coverage`, set each floor to the measured value rounded
                // down to a multiple of 5, and keep raising it toward the 80 target as coverage grows.
                thresholds: coverageThresholds({
                    lines: 0,
                    branches: 0,
                    functions: 0,
                    statements: 0,
                }),
            },
        },
    }),
);
