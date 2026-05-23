import { codecovVitePlugin } from "@codecov/vite-plugin";
import { defineConfig, type PluginOption } from "vite";
import solid from "vite-plugin-solid";

// codecovVitePlugin still declares vite@^6 in peerDependencies; cast keeps the
// plugin usable until @codecov/vite-plugin advertises vite@7 support. Drop the
// cast once the upstream peer range widens.
const codecovToken = process.env.CODECOV_TOKEN?.trim();
const codecovPlugin = codecovVitePlugin({
    enableBundleAnalysis: Boolean(codecovToken),
    bundleName: "demo",
    uploadToken: codecovToken,
    gitService: "github",
}) as PluginOption;

export default defineConfig({
    plugins: [solid(), codecovPlugin],
});
