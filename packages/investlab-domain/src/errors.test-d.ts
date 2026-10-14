import { describe, expectTypeOf, test } from "vitest";
import type { DomainErrorCode } from "./errors.ts";
import type { DomainError } from "@m0n0lab/investlab-core";

describe("DomainError code", () => {
    test("is the literal union of known codes", () => {
        expectTypeOf<DomainErrorCode>().toEqualTypeOf<
            | "PERSISTENCE_ERROR"
            | "VALIDATION_ERROR"
            | "INSTRUMENT_NOT_FOUND"
            | "PORTFOLIO_ITEM_NOT_FOUND"
            | "PORTFOLIO_ITEM_CONFLICT"
        >();
    });

    test("types DomainError.code with that union", () => {
        expectTypeOf<DomainError<DomainErrorCode>["code"]>().toEqualTypeOf<DomainErrorCode>();
    });
});
