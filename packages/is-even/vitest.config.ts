import { resolve } from "node:path";
import { defineProject } from "vitest/config";

export default defineProject({
    resolve: {
        alias: {
            "@monolab/is-odd": resolve(__dirname, "../is-odd/src/index.ts"),
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
    },
    typecheck: {
        enabled: true,
        include: ["**/*.test-d.ts"],
    },
});
