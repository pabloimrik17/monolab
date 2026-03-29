import { type KnipConfig } from "knip";

export default {
    ignore: ["coverage/**/*", "html", "validate-branch-name.config.cjs"],
    ignoreWorkspaces: [".claude/worktrees/**"],
    ignoreDependencies: ["@hookform/devtools", "@storybook/blocks", "validate-branch-name"],
    ignoreExportsUsedInFile: {
        interface: true,
        type: true,
    },
    paths: {
        "*.svg?react": ["node_modules/vite-plugin-svgr/client.d.ts"], // Ajusta la ruta según sea necesario
    },
} satisfies KnipConfig;
