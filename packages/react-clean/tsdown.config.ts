import { defineConfig } from "tsdown";

export default defineConfig({
    name: "@monolab/react-clean",
    entry: ["src/index.ts"],
    format: ["esm"],
    outDir: "dist",
    // Prevent bundling peer deps; rely on consumer to provide them.
    external: [
        /^react($|\/)/,
        /^inversify($|\/)/,
        /^rxjs($|\/)/,
        /^@monolab\/react-hooks($|\/)/,
    ],
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
