import { defineConfig } from "tsdown";

export default defineConfig({
    name: "@m0n0lab/investlab-database",
    entry: ["src/index.ts"],
    format: ["esm"],
    fixedExtension: false,
    outDir: "dist",
    deps: { neverBundle: [/^drizzle-orm($|\/)/, /^pg($|\/)/] },
    dts: {
        compilerOptions: {
            composite: false,
            outDir: "dist",
        },
    },
    sourcemap: true,
    clean: true,
    minify: false,
    target: "ES2025",
});
