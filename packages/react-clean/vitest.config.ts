import { resolve } from "node:path";
import { defineProject } from "vitest/config";

export default defineProject({
    resolve: {
        alias: {
            "@monolab/react-hooks": resolve(
                __dirname,
                "../react-hooks/src/index.ts"
            ),
        },
    },
    test: {
        extends: true,
        reporters: ["default", "junit"],
        outputFile: {
            junit: "./test-results.junit.xml",
        },
        coverage: {
            provider: "v8",
            reporter: ["lcov", "text", "json", "html"],
            reportsDirectory: "./coverage",
        },
        environment: "jsdom",
        setupFiles: ["./vitest.setup.ts"],
    },
    typecheck: {
        enabled: true,
        include: ["**/*.test-d.ts"],
    },
});
