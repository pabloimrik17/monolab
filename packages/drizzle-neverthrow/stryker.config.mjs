import baseConfig from "../../stryker.config.base.mjs";

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
    ...baseConfig,
    dashboard: {
        ...baseConfig.dashboard,
        module: "drizzle-neverthrow",
    },
};

export default config;
