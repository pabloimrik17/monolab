import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useWillUnmount } from "./use-will-unmount.hook.js";

describe("useWillUnmount", () => {
    it("should call callback on unmount", () => {
        const callback = vi.fn();

        const { unmount } = renderHook(() => useWillUnmount(callback));

        expect(callback).not.toHaveBeenCalled();

        unmount();

        expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should not call callback on mount or re-render", () => {
        const callback = vi.fn();

        const { rerender, unmount } = renderHook(() =>
            useWillUnmount(callback)
        );

        expect(callback).not.toHaveBeenCalled();

        rerender();

        expect(callback).not.toHaveBeenCalled();

        unmount();

        expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should handle async callback on unmount", async () => {
        const callback = vi.fn().mockResolvedValue(undefined);

        const { unmount } = renderHook(() => useWillUnmount(callback));

        unmount();

        expect(callback).toHaveBeenCalledTimes(1);
    });
});
