export interface CoverageThresholds {
    lines: number;
    branches: number;
    functions: number;
    statements: number;
}

/**
 * Returns `thresholds` unchanged for a full run and `{}` when `process.argv`
 * contains `--project` or `--project=<name>`, so filtered `test:<kind>:coverage`
 * runs stay informational.
 */
export function coverageThresholds(
    thresholds: CoverageThresholds,
): CoverageThresholds | Record<string, never> {
    const filtered = process.argv.some(
        (arg) => arg === "--project" || arg.startsWith("--project="),
    );
    return filtered ? {} : thresholds;
}
