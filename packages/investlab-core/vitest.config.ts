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
