import type { ViteUserConfig } from "vitest/config";

/**
 * Base every vitest.config.ts merges with `mergeConfig(sharedConfig, ...)`.
 * Keep arrays out: mergeConfig concatenates them with the consumer's.
 */
export const sharedConfig: ViteUserConfig = {
    test: {
        clearMocks: true,
        restoreMocks: true,
        unstubEnvs: true,
        unstubGlobals: true,
        maxConcurrency: 10,
    },
};
