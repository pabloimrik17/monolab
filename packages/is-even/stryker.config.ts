import type { PartialStrykerOptions } from "@stryker-mutator/api/core";
import baseConfig from "../../stryker.config.base.js";

const config: PartialStrykerOptions = {
    ...baseConfig,
    mutate: ["src/**/*.ts", "!src/**/*.spec.ts", "!src/**/*.test.ts"],
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
