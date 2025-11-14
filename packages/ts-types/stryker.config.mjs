import baseConfig from "../../stryker.config.base.mjs";

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
    ...baseConfig,
    mutate: ["src/**/*.ts", "!src/**/*.spec.ts", "!src/**/*.test.ts"],
    thresholds: {
        high: 90,
        low: 75,
        break: 75,
    },
    dashboard: {
        ...baseConfig.dashboard,
        module: "ts-types",
    },
};

export default config;
