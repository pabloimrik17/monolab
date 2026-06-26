import { resolve } from "node:path";
import react from "@vitejs/plugin-react-swc";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [react({ tsDecorators: true })],
    resolve: {
        // Dedupe React so vitest-browser-react and the package share one copy
        // (avoids "Invalid hook call" from a duplicate/mismatched React in browser mode).
        dedupe: ["react", "react-dom"],
        alias: {
            "@m0n0lab/react-hooks": resolve(__dirname, "../react-hooks/src/index.ts"),
        },
    },
    test: {
        include: ["**/*.{test,spec}.{ts,tsx}"],
        globalSetup: ["../../playwright.setup.ts"],
        reporters: ["default", "junit"],
        outputFile: {
            junit: "./test-results.junit.xml",
        },
        coverage: {
            provider: "v8",
            reporter: ["lcov", "text", "json", "html"],
            reportsDirectory: "./coverage",
        },
        browser: {
            enabled: true,
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
        },
    },
});
