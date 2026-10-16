// fallow-ignore-file code-duplication -- every module package declares the same unit / integration-server / integration-client projects
import { defineConfig, mergeConfig } from "vitest/config";
import { sharedConfig } from "@m0n0lab/vitest-config";

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
            },
            projects: [
                { extends: true, test: { name: "unit", include: ["src/**/*.test.ts"] } },
                {
                    extends: true,
                    test: {
                        name: "integration-server",
                        include: ["src/application/server/**/*.integration.ts"],
                        globalSetup: ["src/application/server/vitest-integration-global-setup.ts"],
                        // Each test clones its own database from the migrated template
                        setupFiles: ["src/application/server/vitest-integration-setup.ts"],
                        // Container start-up (image pull) is slow on a cold machine
                        hookTimeout: 120_000,
                    },
                },
                {
                    extends: true,
                    test: {
                        name: "integration-client",
                        include: ["src/application/client/**/*.integration.ts"],
                        setupFiles: ["src/application/client/vitest-integration-setup.ts"],
                    },
                },
            ],
        },
    }),
);
