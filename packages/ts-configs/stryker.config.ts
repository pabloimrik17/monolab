import type { PartialStrykerOptions } from "@stryker-mutator/api/core";
import baseConfig from "../../stryker.config.base.js";

const config: PartialStrykerOptions = {
    ...baseConfig,
    mutate: ["src/**/*.ts", "!src/**/*.spec.ts", "!src/**/*.test.ts"],
    thresholds: {
        high: 70,
        low: 50,
        break: 50,
    },
    dashboard: {
        ...baseConfig.dashboard,
        module: "ts-configs",
    },
};

export default config;
