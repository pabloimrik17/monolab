import baseConfig from "../../stryker.config.base.mjs";

const config = {
    ...baseConfig,
    thresholds: {
        high: 80,
        low: 60,
        break: 60,
    },
    dashboard: {
        ...baseConfig.dashboard,
        module: "wealth-tracker-core",
    },
};
export default config;
