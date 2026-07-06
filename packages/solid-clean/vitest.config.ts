import solidPlugin from "vite-plugin-solid";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [solidPlugin()],
    test: {
        include: ["**/*.{test,spec}.{ts,tsx}"],
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
    },
});
