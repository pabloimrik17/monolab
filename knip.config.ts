import { type KnipConfig } from "knip";

export default {
    ignore: ["validate-branch-name.config.cjs", ".expect/**"],
    // POSIX `diff` (root `lint:legacy-tests`), a system binary, not a package
    ignoreBinaries: ["diff"],
    // tslib: emitted helpers via `importHelpers` in tsconfig.base.json, never imported in source.
    // Feeds `extends: markdownlint/style/prettier` in .markdownlint.jsonc and pairs with markdownlint-cli
    ignoreDependencies: ["markdownlint", "tslib"],
    // Only the cycles-only run (knip --cycles) reports circular imports; the default run leaves them out.
    rules: { cycles: "error" },
    paths: {
        "*.svg?react": ["node_modules/vite-plugin-svgr/client.d.ts"],
    },
    workspaces: {
        // Production entries (`!`): the scripts that root package.json scripts run.
        ".": { entry: ["scripts/*.{cjs,mjs}!"] },
        // Executed by the plugin skills/commands, never imported.
        "claude-plugins/experiments": {
            entry: ["scripts/*.mjs!"],
            // lib helpers are exported so the colocated tests can import them; only the tests use them from outside.
            ignoreExportsUsedInFile: true,
        },
        // Analyse drizzle.config.ts statically instead of executing it: it requires DATABASE_URL (Varlock).
        "packages/investlab-database": {
            drizzle: { config: [], entry: ["drizzle.config.ts"] },
        },
        "apps/qup-web": {
            entry: [
                "app.config.ts!",
                "src/entry-client.tsx!",
                "src/entry-server.tsx!",
                "src/app.tsx!",
                "src/middleware.ts!",
                "src/routes/**/*.tsx!",
                "src/server/**/*.ts!",
            ],
            ignoreDependencies: ["@kobalte/core"],
        },
    },
} satisfies KnipConfig;
