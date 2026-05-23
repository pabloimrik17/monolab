import { codecovVitePlugin } from "@codecov/vite-plugin";
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
    // Codecov bundle analysis runs only on the client router; the server bundle
    // is not user-shipped so its size delta isn't useful to track here.
    vite: ({ router }) => ({
        plugins:
            router === "client"
                ? [
                      codecovVitePlugin({
                          enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined,
                          bundleName: "qup-web",
                          uploadToken: process.env.CODECOV_TOKEN,
                          gitService: "github",
                      }),
                  ]
                : [],
    }),
});
