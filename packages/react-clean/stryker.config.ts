import type { PartialStrykerOptions } from "@stryker-mutator/api/core";
import baseConfig from "../../stryker.config.base.js";

const config: PartialStrykerOptions = {
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
        low: 65,
        break: 60,
    },
    dashboard: {
        ...baseConfig.dashboard,
        module: "react-clean",
    },
};

export default config;
