import baseConfig from "../../stryker.config.base.mjs";

const config = {
    ...baseConfig,
    thresholds: {
        ...baseConfig.thresholds,
        low: 75,
        break: 75,
    },
    // The default timeout counts slow integration tests as kills; 60 s gives the honest score (owner decision 2026-11-07).
    timeoutMS: 60_000,
    mutate: [
        ...baseConfig.mutate,
        "!src/testing/**",
        "!src/**/vitest-integration-*.ts",
        // A table definition holds no logic; its mutants time out locally and survive in CI.
        "!src/**/*.table.ts",
    ],
    dashboard: {
        ...baseConfig.dashboard,
        module: "investlab-catalog",
    },
};
export default config;
