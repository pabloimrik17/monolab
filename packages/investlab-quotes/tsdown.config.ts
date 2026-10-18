import { defineConfig } from "tsdown";

export default defineConfig({
    name: "@m0n0lab/investlab-quotes",
    entry: {
        index: "src/index.ts",
        server: "src/server.ts",
        client: "src/client.ts",
        testing: "src/testing/index.ts",
    },
    format: ["esm"],
    fixedExtension: false,
    outDir: "dist",
    deps: {
        neverBundle: [
            /^@m0n0lab\/investlab-core($|\/)/,
            /^@m0n0lab\/investlab-platform($|\/)/,
            /^inversify($|\/)/,
            /^ioredis($|\/)/,
            /^neverthrow($|\/)/,
            /^zod($|\/)/,
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
