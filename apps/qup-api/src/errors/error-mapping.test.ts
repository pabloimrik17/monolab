import { describe, expect, it } from "vitest";
import {
    EmptyOrderError,
    InvalidCodeError,
    InvalidTransitionError,
    MenuItemNotAvailableError,
    MenuItemNotFoundError,
    OrderNotCancellableError,
    OrderNotFoundError,
    PersistenceError,
    SessionClosedError,
    SessionNotFoundError,
    ValidationError,
} from "@m0n0lab/qup-domain";
import { errorToHttp, toApiError } from "./error-mapping.ts";

describe("errorToHttp", () => {
    it.each([
        [new SessionNotFoundError("x"), 404],
        [new OrderNotFoundError("x"), 404],
        [new MenuItemNotFoundError("x"), 404],
        [new SessionClosedError("x"), 409],
        [new OrderNotCancellableError("x", "DONE"), 409],
        [new InvalidTransitionError("A", "B"), 409],
        [new EmptyOrderError(), 422],
        [new MenuItemNotAvailableError("x"), 422],
        [new ValidationError("bad"), 422],
        [new InvalidCodeError("x"), 422],
        [new PersistenceError(new Error("db")), 500],
    ])("maps %s to %i", (error, expected) => {
        expect(errorToHttp(error)).toBe(expected);
    });
});

describe("toApiError", () => {
    it("builds ApiErrorDto from domain error", () => {
        const error = new SessionNotFoundError("abc");
        const dto = toApiError(error);

        expect(dto).toEqual({
            code: "SESSION_NOT_FOUND",
            message: "Session not found: abc",
            statusCode: 404,
        });
    });
});
