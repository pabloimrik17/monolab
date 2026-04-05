import { defineConfig } from "@solidjs/start/config";

export default defineConfig({
    server: {
        preset: "node-server",
    },
    solid: {
        babel: {
            plugins: [["@babel/plugin-syntax-decorators", { version: "legacy" }]],
        },
    },
});
