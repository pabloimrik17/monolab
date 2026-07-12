import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["scripts/**/*.test.mjs"],
        exclude: [...configDefaults.exclude, "**/.stryker-tmp/**"],
    },
});
