import { configDefaults, defineConfig, mergeConfig } from "vitest/config";
import { coverageThresholds, sharedConfig } from "@m0n0lab/vitest-config";

export default mergeConfig(
    sharedConfig,
    defineConfig({
        test: {
            // Stryker inPlace backups contain copies of all tests; never collect them
            exclude: [...configDefaults.exclude, "**/.stryker-tmp/**"],
            reporters: ["default", "junit"],
            outputFile: {
                junit: "./test-results.junit.xml",
            },
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
            projects: [
                { extends: true, test: { name: "unit" } },
                {
                    extends: true,
                    test: {
                        name: "types",
                        typecheck: { enabled: true, only: true, tsconfig: "./tsconfig.test.json" },
                    },
                },
            ],
        },
    }),
);
