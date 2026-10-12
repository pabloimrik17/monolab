import { describe, expect, it } from "vitest";
import { apiErrorDtoSchema } from "./api-error.dto.ts";

describe("apiErrorDtoSchema", () => {
    it("accepts a domain error body", () => {
        const result = apiErrorDtoSchema.safeParse({
            code: "PORTFOLIO_ITEM_NOT_FOUND",
            message: "Portfolio item not found: p1",
            statusCode: 404,
        });
        expect(result.success).toBe(true);
    });

    it("accepts validation issues", () => {
        const result = apiErrorDtoSchema.safeParse({
            code: "VALIDATION_ERROR",
            message: "Request validation failed",
            statusCode: 422,
            issues: [{ path: "targetWeight", message: "Number must be less than or equal to 100" }],
        });
        expect(result.success).toBe(true);
    });

    it("rejects a code outside the wire union", () => {
        const result = apiErrorDtoSchema.safeParse({
            code: "SOMETHING_ELSE",
            message: "x",
            statusCode: 400,
        });
        expect(result.success).toBe(false);
    });

    it("rejects a non-integer status", () => {
        const result = apiErrorDtoSchema.safeParse({
            code: "UNAUTHORIZED",
            message: "x",
            statusCode: "401",
        });
        expect(result.success).toBe(false);
    });
});
