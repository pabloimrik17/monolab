import { defineConfig } from "tsdown";

export default defineConfig({
    name: "@m0n0lab/investlab-core",
    entry: ["src/index.ts"],
    format: ["esm"],
    outDir: "dist",
    external: [
        /^@m0n0lab\/investlab-domain($|\/)/,
        /^@m0n0lab\/wealth-tracker-core($|\/)/,
        /^ioredis($|\/)/,
        /^inversify($|\/)/,
        /^neverthrow($|\/)/,
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
});
