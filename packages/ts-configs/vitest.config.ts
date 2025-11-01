import { defineProject } from "vitest/config";

export default defineProject({
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
