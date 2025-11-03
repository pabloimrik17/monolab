import react from "@vitejs/plugin-react-swc";
import { playwright } from "@vitest/browser-playwright";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [react({ tsDecorators: true })],
    resolve: {
        alias: {
            "@monolab/react-hooks": resolve(
                __dirname,
                "../react-hooks/src/index.ts"
            ),
        },
    },
    test: {
        include: [
            "**/*.{test,spec}.{ts,tsx}",
            "**/*.browser.test.{ts,tsx}",
            "**/*.integration.ts",
        ],
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
        // Browser tests configuration (enabled via CLI flag)
        browser: {
            enabled: false, // Disabled by default
            provider: playwright({
                launch: {
                    headless: true,
                },
            }),
            instances: [
                {
                    browser: "chromium",
                },
            ],
            fileParallelism: false,
        },
    },
});
