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
        "!src/**/*.test-d.ts",
    ],
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
