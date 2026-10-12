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
                { extends: true, test: { name: "unit" } },
                {
                    extends: true,
                    test: {
                        name: "integration",
                        include: ["src/**/*.integration.ts"],
                        // Postgres container start-up (image pull) is slow on a cold machine
                        hookTimeout: 120_000,
                    },
                },
                {
                    extends: true,
                    test: { name: "types", typecheck: { enabled: true, only: true } },
                },
            ],
        },
    }),
);
