import solidPlugin from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [solidPlugin()],
    test: {
        include: ["**/*.{test,spec}.{ts,tsx}"],
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
    },
});
