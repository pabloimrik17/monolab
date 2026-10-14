import { describe, expectTypeOf, it } from "vitest";
import { useDidMount, useWillUnmount } from "./index.ts";

describe("lifecycle hook types", () => {
    it("useDidMount accepts a synchronous or asynchronous callback and returns void", () => {
        expectTypeOf(useDidMount).parameters.toEqualTypeOf<[() => Promise<void> | void]>();
        expectTypeOf(useDidMount).returns.toBeVoid();
    });

    it("useWillUnmount accepts a synchronous or asynchronous callback and returns void", () => {
        expectTypeOf(useWillUnmount).parameters.toEqualTypeOf<[() => Promise<void> | void]>();
        expectTypeOf(useWillUnmount).returns.toBeVoid();
    });
});
