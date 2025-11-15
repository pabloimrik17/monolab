import baseConfig from "../../stryker.config.base.mjs";

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
    ...baseConfig,
    thresholds: {
        high: 80,
        low: 70,
        break: 70,
    },
    dashboard: {
        ...baseConfig.dashboard,
        module: "react-hooks",
    },
};

export default config;
