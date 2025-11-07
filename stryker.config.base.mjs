/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
    packageManager: "pnpm",
    testRunner: "command",
    commandRunner: {
        command: "pnpm run test:unit",
    },
    ignorePatterns: [
        "target/**",
        "project/**",
        ".metals/**",
        ".bloop/**",
        ".idea/**",
        // Ignore type test
        "packages/**/src/**/*.test-d.ts",
    ],
    coverageAnalysis: "off",
    incremental: true,
    incrementalFile: "reports/stryker-incremental.json",
    inPlace: true,
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
