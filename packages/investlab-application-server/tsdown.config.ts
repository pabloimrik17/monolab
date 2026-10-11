import { defineConfig } from "tsdown";

export default defineConfig({
    name: "@m0n0lab/investlab-application-server",
    entry: ["src/index.ts"],
    format: ["esm"],
    fixedExtension: false,
    outDir: "dist",
    deps: {
        neverBundle: [/^@m0n0lab\/investlab-domain($|\/)/, /^inversify($|\/)/, /^neverthrow($|\/)/],
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
