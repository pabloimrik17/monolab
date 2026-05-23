import { codecovVitePlugin } from "@codecov/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig, type PluginOption } from "vite";

// Cast: see note in apps/demo/vite.config.ts — drop once @codecov/vite-plugin
// advertises vite@7 in peerDependencies.
const codecovPlugin = codecovVitePlugin({
    enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined,
    bundleName: "wealth-react",
    uploadToken: process.env.CODECOV_TOKEN,
    gitService: "github",
}) as PluginOption;

export default defineConfig({
    plugins: [reactRouter(), codecovPlugin],
});
