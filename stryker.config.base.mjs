/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
    packageManager: "pnpm",
    plugins: ["@stryker-mutator/vitest-runner", "@stryker-mutator/typescript-checker"],
    testRunner: "vitest",
    mutate: [
        "src/**/*.ts",
        "src/**/*.tsx",
        "!src/**/*.spec.ts",
        "!src/**/*.spec.tsx",
        "!src/**/*.test.ts",
        "!src/**/*.test.tsx",
        "!src/**/*.test-d.ts",
        "!src/**/*.integration.ts",
        "!src/**/*.integration.tsx",
        "!src/**/*.integration-platform.ts",
        "!src/**/*.integration-platform.tsx",
    ],
    ignorePatterns: [
        "target/**",
        "project/**",
        ".metals/**",
        ".bloop/**",
        ".idea/**",
        // Ignore type test
        "packages/**/src/**/*.test-d.ts",
    ],
    coverageAnalysis: "perTest",
    incremental: true,
    incrementalFile: "reports/stryker-incremental.json",
    inPlace: true,
    reporters: [
        "html",
        "json",
        "clear-text",
        "progress",
        ...(process.env.STRYKER_DASHBOARD_API_KEY ? ["dashboard"] : []),
    ],
    htmlReporter: {
        fileName: "reports/mutation/index.html",
    },
    jsonReporter: {
        fileName: "reports/mutation/report.json",
    },
    thresholds: {
        high: 90,
        low: 80,
        break: 80,
    },
    concurrency: "50%",
    dashboard: {
        project: "github.com/pabloimrik17/monolab",
        baseUrl: "https://dashboard.stryker-mutator.io/api/reports",
        version: process.env.GITHUB_REF_NAME || "local",
    },
};

export default config;
