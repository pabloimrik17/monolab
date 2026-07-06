import { defineConfig } from "tsdown";

export default defineConfig({
    name: "@m0n0lab/investlab-data",
    entry: ["src/index.ts"],
    format: ["esm"],
    fixedExtension: false,
    outDir: "dist",
    deps: {
        neverBundle: [
            /^@m0n0lab\/investlab-domain($|\/)/,
            /^drizzle-orm($|\/)/,
            /^pg($|\/)/,
            /^inversify($|\/)/,
            /^neverthrow($|\/)/,
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
});
