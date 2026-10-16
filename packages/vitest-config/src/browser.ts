import { playwright } from "@vitest/browser-playwright";
import type { TestUserConfig } from "vitest/config";

/**
 * Runs the project's tests in headless Playwright Chromium.
 * A factory because Vitest mutates the resolved browser config.
 */
export function headlessChromium(): NonNullable<TestUserConfig["browser"]> {
    return {
        enabled: true,
        headless: true,
        provider: playwright(),
        instances: [{ browser: "chromium" }],
    };
}
