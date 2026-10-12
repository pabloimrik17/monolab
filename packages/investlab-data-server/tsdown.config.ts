import { defineConfig } from "tsdown";

export default defineConfig({
    name: "@m0n0lab/investlab-data-server",
    // `finnhub`: browser-safe entry (no DI/drivers) for the legacy ticker poller; drop with tasks §12.3
    entry: {
        index: "src/index.ts",
        finnhub: "src/datasources/finnhub-quote.datasource.ts",
    },
    format: ["esm"],
    fixedExtension: false,
    outDir: "dist",
    deps: {
        neverBundle: [
            /^@m0n0lab\/investlab-domain($|\/)/,
            /^drizzle-orm($|\/)/,
            /^pg($|\/)/,
            /^inversify($|\/)/,
            /^ioredis($|\/)/,
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
