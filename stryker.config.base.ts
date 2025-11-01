import type { PartialStrykerOptions } from "@stryker-mutator/api/core";

const config: PartialStrykerOptions = {
    packageManager: "pnpm",
    testRunner: "vitest",
    coverageAnalysis: "perTest",
    incremental: true,
    incrementalFile: "reports/stryker-incremental.json",
    reporters: ["html", "json", "clear-text", "progress"],
    htmlReporter: {
        fileName: "reports/mutation/index.html",
    },
    jsonReporter: {
        fileName: "reports/mutation/report.json",
    },
    thresholds: {
        high: 80,
        low: 60,
        break: 60,
    },
    concurrency: 4,
    dashboard: {
        project: "github.com/pabloimrik17/monolab",
        baseUrl: "https://dashboard.stryker-mutator.io/api/reports",
        version: process.env.GITHUB_REF_NAME || "local",
    },
};

export default config;
