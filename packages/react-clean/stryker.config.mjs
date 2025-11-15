import baseConfig from "../../stryker.config.base.mjs";

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
    ...baseConfig,
    thresholds: {
        high: 90,
        low: 80,
        break: 80,
    },
    dashboard: {
        ...baseConfig.dashboard,
        module: "react-clean",
    },
};

export default config;
