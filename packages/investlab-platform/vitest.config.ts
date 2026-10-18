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
            projects: [
                { extends: true, test: { name: "unit", include: ["src/**/*.test.ts"] } },
                {
                    extends: true,
                    test: { name: "integration", include: ["src/**/*.integration.ts"] },
                },
            ],
            coverage: {
                provider: "v8",
                include: ["src/**/*.ts"],
                exclude: [
                    "**/*.test-d.ts",
                    "**/*.integration.{ts,tsx}",
                    "**/testing/**",
                    "**/vitest-*setup*.ts",
                ],
                thresholds: coverageThresholds({
                    lines: 80,
                    branches: 80,
                    functions: 80,
                    statements: 80,
                }),
                reporter: ["lcov", "text", "json", "html"],
                reportsDirectory: "./coverage",
            },
        },
    }),
);
