import { defineConfig } from "tsdown";

export default defineConfig({
    name: "@m0n0lab/solid-clean",
    entry: ["src/index.ts"],
    format: ["esm"],
    outDir: "dist",
    external: [/^solid-js($|\/)/],
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
