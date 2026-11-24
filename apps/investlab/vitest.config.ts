import { defineConfig, mergeConfig } from "vitest/config";
import { coverageThresholds, sharedConfig } from "@m0n0lab/vitest-config";
import { headlessChromium } from "@m0n0lab/vitest-config/browser";

export default mergeConfig(
    sharedConfig,
    defineConfig({
        resolve: {
            // vitest-browser-react and the app must share one React copy, or browser mode throws "Invalid hook call".
            dedupe: ["react", "react-dom"],
        },
        test: {
            projects: [
                // extends: true carries sharedConfig's tsconfig-paths resolution (#core/*, #di/*) into both projects
                {
                    extends: true,
                    test: { name: "unit", include: ["src/**/*.{test,spec}.{ts,tsx}"] },
                },
                {
                    extends: true,
                    test: {
                        name: "integration-platform",
                        include: ["src/**/*.integration-platform.{ts,tsx}"],
                        browser: headlessChromium(),
                    },
                },
            ],
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
                    "**/*.harness.{ts,tsx}",
                    "**/harness/**",
                    "**/vitest-*setup*.ts",
                    "**/.react-router/**",
                    "**/*.d.ts",
                ],
                // Below ADR 0008's 80 target: a one-off exception to its never-lower rule, recorded in the
                // clean-architecture-layout design §12. agentic-task-1caz continues the climb. Whoever adds
                // tests here re-measures with `test:coverage` and raises every metric that passed its next
                // multiple of 5, until each one reaches 80.
                thresholds: coverageThresholds({
                    lines: 65,
                    branches: 75,
                    functions: 70,
                    statements: 70,
                }),
            },
        },
    }),
);
