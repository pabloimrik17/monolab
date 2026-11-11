import baseConfig from "../../stryker.config.base.mjs";

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
    ...baseConfig,
    // Browser-mode tests: fewer workers and longer timeouts turn a timed-out mutant into a kill
    concurrency: 2,
    timeoutMS: 15_000,
    timeoutFactor: 3,
    dashboard: {
        ...baseConfig.dashboard,
        module: "react-hooks",
    },
};

export default config;
