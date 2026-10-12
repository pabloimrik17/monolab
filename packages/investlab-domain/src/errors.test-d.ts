import { describe, expectTypeOf, test } from "vitest";
import type { DomainError, DomainErrorCode } from "./errors.ts";

describe("DomainError code", () => {
    test("is the literal union of known codes", () => {
        expectTypeOf<DomainErrorCode>().toEqualTypeOf<
            | "PERSISTENCE_ERROR"
            | "VALIDATION_ERROR"
            | "INSTRUMENT_NOT_FOUND"
            | "PORTFOLIO_ITEM_NOT_FOUND"
        >();
    });

    test("types DomainError.code with that union", () => {
        expectTypeOf<DomainError["code"]>().toEqualTypeOf<DomainErrorCode>();
    });
});
