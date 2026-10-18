import baseConfig from "../../stryker.config.base.mjs";

const config = {
    ...baseConfig,
    thresholds: {
        ...baseConfig.thresholds,
        low: 75,
        break: 75,
    },
    dashboard: {
        ...baseConfig.dashboard,
        module: "solid-clean",
    },
};
export default config;
