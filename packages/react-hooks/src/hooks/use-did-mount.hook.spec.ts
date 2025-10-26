import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDidMount } from "./use-did-mount.hook.js";

describe("useDidMount", () => {
    it("should call callback on mount", () => {
        const callback = vi.fn();

        renderHook(() => useDidMount(callback));

        expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should not call callback on re-render", () => {
        const callback = vi.fn();

        const { rerender } = renderHook(() => useDidMount(callback));

        expect(callback).toHaveBeenCalledTimes(1);

        rerender();

        expect(callback).toHaveBeenCalledTimes(1);
    });
});
