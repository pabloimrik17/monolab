import baseConfig from "../../stryker.config.base.mjs";

const config = {
    ...baseConfig,
    thresholds: {
        high: 80,
        low: 75,
        break: 75,
    },
    dashboard: {
        ...baseConfig.dashboard,
        module: "qup-domain",
    },
};
export default config;
