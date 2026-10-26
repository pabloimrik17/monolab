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
                exclude: ["**/*.integration-platform.ts", "**/*.harness.ts", "**/testing/**"],
                thresholds: coverageThresholds({
                    lines: 80,
                    branches: 80,
                    functions: 80,
                    statements: 80,
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
