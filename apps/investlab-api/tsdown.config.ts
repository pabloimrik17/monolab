import { codecovRollupPlugin } from "@codecov/rollup-plugin";
import { defineConfig } from "tsdown";

const codecovToken = process.env["CODECOV_TOKEN"]?.trim();

export default defineConfig({
    name: "@m0n0lab/investlab-api",
    entry: ["src/index.ts"],
    format: ["esm"],
    outDir: "dist",
    deps: {
        neverBundle: [
            /^@m0n0lab\//,
            /^drizzle-orm($|\/)/,
            /^hono($|\/)/,
            /^inversify($|\/)/,
            /^ioredis($|\/)/,
            /^neverthrow($|\/)/,
            /^pg($|\/)/,
        ],
    },
    dts: {
        compilerOptions: {
            composite: false,
            outDir: "dist",
        },
    },
    sourcemap: true,
    clean: true,
    minify: false,
    target: "ES2023",
    plugins: [
        codecovRollupPlugin({
            enableBundleAnalysis: Boolean(codecovToken),
            bundleName: "investlab-api",
            ...(codecovToken != null && { uploadToken: codecovToken }),
            gitService: "github",
        }),
    ],
});
