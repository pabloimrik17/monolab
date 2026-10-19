import baseConfig from "../../stryker.config.base.mjs";

const config = {
    ...baseConfig,
    dashboard: {
        ...baseConfig.dashboard,
        module: "http-client",
    },
};
export default config;
