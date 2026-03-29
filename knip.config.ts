import { type KnipConfig } from "knip";

export default {
    ignore: ["coverage/**/*", "html", "validate-branch-name.config.cjs"],
    ignoreWorkspaces: [".claude/worktrees/**"],
    ignoreDependencies: ["validate-branch-name"],
    ignoreExportsUsedInFile: {
        interface: true,
        type: true,
    },
    paths: {
        "*.svg?react": ["node_modules/vite-plugin-svgr/client.d.ts"],
    },
    workspaces: {
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
