import react from "@vitejs/plugin-react-swc";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [react()],
    test: {
        include: ["**/*.{test,spec}.{ts,tsx}"],
        exclude: [
            "**/*.browser.test.{ts,tsx}",
            "**/*.integration.ts",
            "**/node_modules/**",
            "**/dist/**",
            "**/.idea/**",
            "**/.git/**",
            "**/.cache/**",
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
        },
    },
});
