import { codecovSvelteKitPlugin } from "@codecov/sveltekit-plugin";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig, type PluginOption } from "vite";

// Cast: see note in apps/demo/vite.config.ts — @codecov/sveltekit-plugin
// inherits the same vite@^6 peer range constraint.
const codecovToken = process.env.CODECOV_TOKEN?.trim();
const codecovPlugin = codecovSvelteKitPlugin({
    enableBundleAnalysis: Boolean(codecovToken),
    bundleName: "green-beard",
    uploadToken: codecovToken,
    gitService: "github",
}) as PluginOption;

export default defineConfig({
    plugins: [sveltekit(), codecovPlugin],
});
