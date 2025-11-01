import baseConfig from "../../stryker.config.base.mjs";

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
    ...baseConfig,
    mutate: [
        "src/**/*.ts",
        "src/**/*.tsx",
        "!src/**/*.spec.ts",
        "!src/**/*.spec.tsx",
        "!src/**/*.test.ts",
        "!src/**/*.test.tsx",
    ],
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
