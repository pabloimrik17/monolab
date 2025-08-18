import { defineConfig } from "tsdown";

export default defineConfig({
    name: "@monolab/react-hooks",
    entry: ["src/index.ts"],
    format: ["esm"],
    outDir: "dist",
    dts: {
        compilerOptions: {
            composite: false,
            outDir: "dist",
            // @ts-expect-error: tsdown types
            entry: ["src/index.ts"],
        },
    },
    sourcemap: true,
    clean: true,
    minify: false,
    target: "ES2023",
});
