import { describe, expectTypeOf, test } from "vitest";
import type { HttpError, HttpRetryConfig } from "../index.js";

/**
 * Type-level tests for HttpRetryConfig interface.
 * @vitest-environment node
 */

describe("HttpRetryConfig type safety", () => {
    test("HttpRetryConfig has required and optional properties", () => {
        const config: HttpRetryConfig = {
            attempts: 3,
            delay: 1000,
        };

        expectTypeOf(config.attempts).toEqualTypeOf<number>();
        expectTypeOf(config.delay).toMatchTypeOf<
            number | ((attempt: number, error: HttpError) => number)
        >();
        expectTypeOf(config.condition).toEqualTypeOf<
            ((error: HttpError) => boolean) | undefined
        >();
    });
});
