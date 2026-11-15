import { codecovSvelteKitPlugin } from "@codecov/sveltekit-plugin";
import { sveltekit } from "@sveltejs/kit/vite";
import { msw } from "msw/vite";
import { defineConfig, type PluginOption } from "vite";

// Cast: see note in apps/investlab/vite.config.ts — @codecov/sveltekit-plugin
// inherits the same vite@^6 peer range constraint.
const codecovToken = process.env["CODECOV_TOKEN"]?.trim();
const codecovPlugin = codecovSvelteKitPlugin({
    enableBundleAnalysis: Boolean(codecovToken),
    bundleName: "green-beard",
    ...(codecovToken != null && { uploadToken: codecovToken }),
    gitService: "github",
}) as PluginOption;

export default defineConfig({
    plugins: [
        sveltekit(),
        codecovPlugin,
        // worker-only mode also emits the worker into builds, so it only runs on the dev server.
        { ...msw({ mode: "worker-only" }), apply: "serve" },
    ],
});
