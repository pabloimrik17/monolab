import { resolve } from "node:path";
import react from "@vitejs/plugin-react-swc";
import { configDefaults, defineConfig, mergeConfig } from "vitest/config";
import { sharedConfig } from "@m0n0lab/vitest-config";
import { headlessChromium } from "@m0n0lab/vitest-config/browser";

export default mergeConfig(
    sharedConfig,
    defineConfig({
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
            browser: headlessChromium(),
            projects: [
                {
                    extends: true,
                    test: { name: "unit", include: ["**/*.{test,spec}.{ts,tsx}"] },
                },
                {
                    extends: true,
                    test: { name: "integration", include: ["src/**/*.integration.{ts,tsx}"] },
                },
                {
                    extends: true,
                    test: { name: "types", typecheck: { enabled: true, only: true } },
                },
            ],
        },
    }),
);
