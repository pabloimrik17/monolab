import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        passWithNoTests: true,
        include: ["**/*.{test,spec}.ts"],
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
});
