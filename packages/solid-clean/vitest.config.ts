import solidPlugin from "vite-plugin-solid";
import { configDefaults, defineConfig, mergeConfig } from "vitest/config";
import { coverageThresholds, sharedConfig } from "@m0n0lab/vitest-config";

export default mergeConfig(
    sharedConfig,
    defineConfig({
        plugins: [solidPlugin()],
        test: {
            include: ["**/*.{test,spec}.{ts,tsx}"],
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
                // Below the 80 target of ADR 0008 (docs/adr/0008-test-policy.md): these floors are the CI
                // measurement of 2026-10-18 rounded down to a multiple of 5 (lines 88.23, branches 50, functions 100,
                // statements 88.23). Never lower them. Whoever adds tests here re-measures with `test:coverage` and
                // raises every metric that passed its next multiple of 5, until each one reaches 80.
                thresholds: coverageThresholds({
                    lines: 80,
                    branches: 50,
                    functions: 80,
                    statements: 80,
                }),
                reporter: ["lcov", "text", "json", "html"],
                reportsDirectory: "./coverage",
            },
        },
    }),
);
