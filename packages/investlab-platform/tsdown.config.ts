import { defineConfig } from "tsdown";

export default defineConfig({
    name: "@m0n0lab/investlab-platform",
    entry: ["src/server.ts", "src/client.ts"],
    format: ["esm"],
    fixedExtension: false,
    outDir: "dist",
    deps: {
        neverBundle: [
            /^@m0n0lab\/drizzle-neverthrow($|\/)/,
            /^@m0n0lab\/investlab-core($|\/)/,
            /^drizzle-orm($|\/)/,
            /^inversify($|\/)/,
            /^ioredis($|\/)/,
            /^neverthrow($|\/)/,
            /^pg($|\/)/,
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
