import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: {
            "@monolab/react-hooks": resolve(
                __dirname,
                "../react-hooks/src/index.ts"
            ),
        },
    },
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
        environment: "jsdom",
        setupFiles: ["./vitest.setup.ts"],
    },
});
