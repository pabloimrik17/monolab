/**
 * Vitest workspace configuration for MonoLab monorepo
 *
 * This workspace auto-discovers per-package vitest.config.ts files.
 * Each package has its own isolated configuration to prevent test result
 * file overwrites when Nx runs tests sequentially.
 *
 * Each package config includes:
 * - JUnit XML reporter for Codecov Test Analytics
 * - Isolated output paths (e.g., packages/react-hooks/test-results.junit.xml)
 * - Coverage configuration with v8 provider and lcov reporter
 *
 * @see https://vitest.dev/guide/workspace
 * @see https://docs.codecov.com/docs/test-analytics
 */
export default ["packages/*"];
