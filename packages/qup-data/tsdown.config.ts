import { defineConfig } from "tsdown";

export default defineConfig({
    name: "@m0n0lab/qup-data",
    entry: ["src/index.ts"],
    format: ["esm"],
    outDir: "dist",
    external: [
        /^@m0n0lab\/qup-domain($|\/)/,
        /^drizzle-orm($|\/)/,
        /^pg($|\/)/,
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
