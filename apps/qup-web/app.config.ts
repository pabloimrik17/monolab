import { codecovVitePlugin } from "@codecov/vite-plugin";
import { defineConfig } from "@solidjs/start/config";

const codecovToken = process.env.CODECOV_TOKEN?.trim();

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
                          enableBundleAnalysis: Boolean(codecovToken),
                          bundleName: "qup-web",
                          uploadToken: codecovToken,
                          gitService: "github",
                      }),
                  ]
                : [],
    }),
});
