import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [solid()],

    resolve: {
        alias: {
            "@monolab/is-odd": resolve(
                __dirname,
                "../../packages/is-odd/src/index.ts"
            ),
            "@monolab/is-even": resolve(
                __dirname,
                "../../packages/is-even/src/index.ts"
            ),
        },
    },
});
