import { configDefaults, defineConfig, mergeConfig } from "vitest/config";
import { sharedConfig } from "@m0n0lab/vitest-config";

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
                reporter: ["lcov", "text", "json", "html"],
                reportsDirectory: "./coverage",
            },
            projects: [
                { extends: true, test: { name: "unit", typecheck: { enabled: true } } },
                {
                    extends: true,
                    test: {
                        name: "integration",
                        include: ["src/**/*.integration.ts"],
                        globalSetup: ["src/testing/containers.global-setup.ts"],
                        // Each file clones its own database and takes its own Redis database
                        setupFiles: ["src/testing/vitest-integration-setup.ts"],
                        // Container start-up (image pull) is slow on a cold machine
                        hookTimeout: 120_000,
                    },
                },
            ],
        },
    }),
);
