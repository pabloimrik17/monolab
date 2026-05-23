import { codecovRollupPlugin } from "@codecov/rollup-plugin";
import { defineConfig } from "tsdown";

const codecovToken = process.env.CODECOV_TOKEN?.trim();

export default defineConfig({
    name: "@m0n0lab/investlab",
    entry: ["src/index.ts"],
    format: ["esm"],
    outDir: "dist",
    external: [
        /^@m0n0lab\//,
        /^inversify($|\/)/,
        /^neverthrow($|\/)/,
        /^drizzle-orm($|\/)/,
        /^pg($|\/)/,
        /^ioredis($|\/)/,
    ],
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
            bundleName: "investlab",
            uploadToken: codecovToken,
            gitService: "github",
        }),
    ],
});
