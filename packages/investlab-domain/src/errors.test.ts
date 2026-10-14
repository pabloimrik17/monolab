import { describe, expect, it } from "vitest";
import { PortfolioItemConflictError } from "./errors.ts";

describe("PortfolioItemConflictError", () => {
    it("carries the PORTFOLIO_ITEM_CONFLICT code and names the item", () => {
        const error = new PortfolioItemConflictError("item-1");

        expect(error).toBeInstanceOf(Error);
        expect(error.code).toBe("PORTFOLIO_ITEM_CONFLICT");
        expect(error.name).toBe("PortfolioItemConflictError");
        expect(error.message).toBe(
            "Portfolio item item-1 was changed by another request; reload and try again",
        );
    });
});
