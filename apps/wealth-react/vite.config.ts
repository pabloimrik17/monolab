import { codecovVitePlugin } from "@codecov/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig, type PluginOption } from "vite";

// Cast: see note in apps/demo/vite.config.ts — drop once @codecov/vite-plugin
// advertises vite@7 in peerDependencies.
const codecovToken = process.env.CODECOV_TOKEN?.trim();
const codecovPlugin = codecovVitePlugin({
    enableBundleAnalysis: Boolean(codecovToken),
    bundleName: "wealth-react",
    uploadToken: codecovToken,
    gitService: "github",
}) as PluginOption;

export default defineConfig({
    plugins: [reactRouter(), codecovPlugin],
});
