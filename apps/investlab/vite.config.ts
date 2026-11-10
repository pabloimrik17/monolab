import { codecovVitePlugin } from "@codecov/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import { varlockVitePlugin } from "@varlock/vite-integration";
import { msw } from "msw/vite";
import { defineConfig, type PluginOption } from "vite";

// codecovVitePlugin still declares vite@^6 in peerDependencies; cast keeps the
// plugin usable until @codecov/vite-plugin advertises vite@7 support. Drop the
// cast once the upstream peer range widens.
const codecovToken = process.env["CODECOV_TOKEN"]?.trim();
const codecovPlugin = codecovVitePlugin({
    enableBundleAnalysis: Boolean(codecovToken),
    bundleName: "investlab",
    ...(codecovToken != null && { uploadToken: codecovToken }),
    gitService: "github",
}) as PluginOption;

export default defineConfig({
    plugins: [
        varlockVitePlugin(),
        reactRouter(),
        codecovPlugin,
        // worker-only mode also emits the worker into builds, so it only runs on the dev server.
        { ...msw({ mode: "worker-only" }), apply: "serve" },
    ],
    resolve: { tsconfigPaths: true },
});
