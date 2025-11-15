import baseConfig from "../../stryker.config.base.mjs";

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
    ...baseConfig,
    thresholds: {
        high: 90,
        low: 75,
        break: 75,
    },
    dashboard: {
        ...baseConfig.dashboard,
        module: "is-even",
    },
};

export default config;
