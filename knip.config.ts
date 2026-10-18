import { type KnipConfig } from "knip";

export default {
    ignore: [
        "coverage/**/*",
        "html",
        "validate-branch-name.config.cjs",
        "apps/*/.react-router/**",
        ".expect/**",
    ],
    ignoreWorkspaces: [".claude/worktrees/**"],
    ignoreDependencies: ["validate-branch-name"],
    // POSIX `diff` (root `lint:legacy-tests`), a system binary, not a package
    ignoreBinaries: ["diff"],
    ignoreExportsUsedInFile: {
        interface: true,
        type: true,
    },
    paths: {
        "*.svg?react": ["node_modules/vite-plugin-svgr/client.d.ts"],
    },
    workspaces: {
        // Varlock loads it from `.env.schema` (`@plugin`), which knip cannot see.
        "apps/investlab": {
            ignoreDependencies: ["@varlock/1password-plugin"],
        },
        "apps/investlab-api": {
            ignoreDependencies: ["@varlock/1password-plugin"],
        },
        // Analyse drizzle.config.ts statically instead of executing it: it requires DATABASE_URL (Varlock).
        "packages/investlab-database": {
            drizzle: { config: [], entry: ["drizzle.config.ts"] },
        },
        "apps/qup-api": {
            entry: ["src/index.ts"],
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
