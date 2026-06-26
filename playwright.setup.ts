import { execSync } from "node:child_process";

/**
 * Vitest global setup for packages that run in Playwright browser mode
 * (react-hooks, react-clean — see `browser.enabled` in their vitest.config.ts).
 *
 * CI distributes test tasks to Nx Cloud agents that do not ship the Chromium
 * binary, so every vitest invocation (unit, coverage, types, mutation) must
 * ensure it is installed first. Idempotent: a fast no-op once present.
 */
export default function setup(): void {
    execSync("pnpm exec playwright install chromium", { stdio: "inherit" });
}
