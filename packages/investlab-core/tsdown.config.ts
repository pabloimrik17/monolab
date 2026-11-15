import { defineConfig } from "tsdown";

export default defineConfig({
    name: "@m0n0lab/investlab-core",
    entry: ["src/index.ts"],
    format: ["esm"],
    fixedExtension: false,
    outDir: "dist",
    deps: { neverBundle: [/^zod($|\/)/] },
    dts: {
        compilerOptions: {
            composite: false,
            outDir: "dist",
        },
    },
    sourcemap: true,
    clean: true,
    minify: false,
    target: "ES2024",
});
