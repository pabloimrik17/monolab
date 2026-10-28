import { type KnipConfig } from "knip";

export default {
    ignore: ["validate-branch-name.config.cjs", ".expect/**"],
    // POSIX `diff` (root `lint:legacy-tests`), a system binary, not a package
    ignoreBinaries: ["diff"],
    // Only the cycles-only run (knip --cycles) reports circular imports; the default run leaves them out.
    rules: { cycles: "error" },
    paths: {
        "*.svg?react": ["node_modules/vite-plugin-svgr/client.d.ts"],
    },
    workspaces: {
        // Analyse drizzle.config.ts statically instead of executing it: it requires DATABASE_URL (Varlock).
        "packages/investlab-database": {
            drizzle: { config: [], entry: ["drizzle.config.ts"] },
        },
        "apps/qup-web": {
            entry: [
                "app.config.ts",
                "src/entry-client.tsx",
                "src/entry-server.tsx",
                "src/app.tsx",
                "src/middleware.ts",
                "src/routes/**/*.tsx",
                "src/server/**/*.ts",
            ],
            ignoreDependencies: ["@kobalte/core"],
        },
    },
} satisfies KnipConfig;
