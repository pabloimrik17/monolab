import { defineConfig } from "tsdown";

export default defineConfig({
    name: "@m0n0lab/wealth-tracker-core",
    entry: ["src/index.ts"],
    format: ["esm"],
    outDir: "dist",
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
