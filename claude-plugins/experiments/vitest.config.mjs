import { configDefaults, defineConfig, mergeConfig } from "vitest/config";
import { coverageThresholds, sharedConfig } from "@m0n0lab/vitest-config";

export default mergeConfig(
    sharedConfig,
    defineConfig({
        test: {
            exclude: [...configDefaults.exclude, "**/.stryker-tmp/**"],
            reporters: ["default", "junit"],
            outputFile: {
                junit: "./test-results.junit.xml",
            },
            coverage: {
                provider: "v8",
                reporter: ["lcov", "text", "json", "html"],
                reportsDirectory: "./coverage",
                include: ["scripts/**/*.mjs"],
                exclude: ["scripts/**/*.test.mjs", "scripts/fixtures/**"],
                thresholds: coverageThresholds({
                    lines: 75,
                    branches: 65,
                    functions: 80,
                    statements: 70,
                }),
            },
            projects: [
                {
                    extends: true,
                    test: { name: "unit", include: ["scripts/**/*.test.mjs"] },
                },
            ],
        },
    }),
);
