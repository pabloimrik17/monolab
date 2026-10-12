import { codecovVitePlugin } from "@codecov/vite-plugin";
import { defineConfig } from "@solidjs/start/config";

const codecovToken = process.env["CODECOV_TOKEN"]?.trim();

export default defineConfig({
    middleware: "./src/middleware.ts",
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
    // `router` typed inline: SolidStart's vite option type collapses to `any`
    // (it imports types vinxi 0.5 no longer ships), so it can't be inferred.
    vite: ({ router }: { router: "server" | "client" | "server-function" }) => ({
        plugins:
            router === "client"
                ? [
                      codecovVitePlugin({
                          enableBundleAnalysis: Boolean(codecovToken),
                          bundleName: "qup-web",
                          ...(codecovToken != null && { uploadToken: codecovToken }),
                          gitService: "github",
                      }),
                  ]
                : [],
    }),
});
