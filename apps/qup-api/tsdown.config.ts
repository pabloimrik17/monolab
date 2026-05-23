import { codecovRollupPlugin } from "@codecov/rollup-plugin";
import { defineConfig } from "tsdown";

const codecovToken = process.env.CODECOV_TOKEN?.trim();

export default defineConfig({
    name: "@m0n0lab/qup-api",
    entry: ["src/index.ts"],
    format: ["esm"],
    outDir: "dist",
    external: [
        /^@m0n0lab\//,
        /^hono($|\/)/,
        /^inversify($|\/)/,
        /^neverthrow($|\/)/,
        /^drizzle-orm($|\/)/,
        /^pg($|\/)/,
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
            bundleName: "qup-api",
            uploadToken: codecovToken,
            gitService: "github",
        }),
    ],
});
