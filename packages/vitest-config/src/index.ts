import type { ViteUserConfig } from "vitest/config";

/**
 * Base every vitest.config.ts merges with `mergeConfig(sharedConfig, ...)`.
 * Keep arrays out: mergeConfig concatenates them with the consumer's.
 */
export const sharedConfig: ViteUserConfig = {
    test: {
        restoreMocks: true,
        unstubEnvs: true,
        unstubGlobals: true,
        maxConcurrency: 10,
    },
};

export { coverageThresholds } from "./coverage-thresholds.ts";
export type { CoverageThresholds } from "./coverage-thresholds.ts";
