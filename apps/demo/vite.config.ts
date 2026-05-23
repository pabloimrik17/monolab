import { codecovVitePlugin } from "@codecov/vite-plugin";
import { defineConfig, type PluginOption } from "vite";
import solid from "vite-plugin-solid";

// codecovVitePlugin still declares vite@^6 in peerDependencies; cast keeps the
// plugin usable until @codecov/vite-plugin advertises vite@7 support. Drop the
// cast once the upstream peer range widens.
const codecovPlugin = codecovVitePlugin({
    enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined,
    bundleName: "demo",
    uploadToken: process.env.CODECOV_TOKEN,
    gitService: "github",
}) as PluginOption;

export default defineConfig({
    plugins: [solid(), codecovPlugin],
});
