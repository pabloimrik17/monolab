import baseConfig from "../../stryker.config.base.mjs";

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
    ...baseConfig,
    dashboard: {
        ...baseConfig.dashboard,
        module: "ts-types",
    },
};

export default config;
