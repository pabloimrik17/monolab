import { codecovSvelteKitPlugin } from "@codecov/sveltekit-plugin";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig, type PluginOption } from "vite";

// Cast: see note in apps/demo/vite.config.ts — @codecov/sveltekit-plugin
// inherits the same vite@^6 peer range constraint.
const codecovPlugin = codecovSvelteKitPlugin({
    enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined,
    bundleName: "green-beard",
    uploadToken: process.env.CODECOV_TOKEN,
    gitService: "github",
}) as PluginOption;

export default defineConfig({
    plugins: [sveltekit(), codecovPlugin],
});
