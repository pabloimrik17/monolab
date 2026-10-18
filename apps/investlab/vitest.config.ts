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
                include: ["app/**/*.{ts,tsx}"],
                exclude: [
                    "**/*.test-d.ts",
                    "**/*.integration.{ts,tsx}",
                    "**/*.integration-platform.{ts,tsx}",
                    "**/testing/**",
                    "**/vitest-*setup*.ts",
                    "**/.react-router/**",
                    "**/*.d.ts",
                ],
                thresholds: coverageThresholds({
                    lines: 50,
                    branches: 45,
                    functions: 45,
                    statements: 50,
                }),
            },
        },
    }),
);
