import { describe, expect, it, vi } from "vitest";
import { renderHook } from "vitest-browser-react";
import { useWillUnmount } from "./use-will-unmount.hook.ts";

describe("useWillUnmount", () => {
    it("should call callback on unmount", async () => {
        const callback = vi.fn();

        const { unmount } = await renderHook(() => useWillUnmount(callback));

        expect(callback).not.toHaveBeenCalled();

        await unmount();

        expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should not call callback on mount or re-render", async () => {
        const callback = vi.fn();

        const { rerender, unmount } = await renderHook(() => useWillUnmount(callback));

        expect(callback).not.toHaveBeenCalled();

        await rerender();

        expect(callback).not.toHaveBeenCalled();

        await unmount();

        expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should handle async callback on unmount", async () => {
        const callback = vi.fn().mockResolvedValue(undefined);

        const { unmount } = await renderHook(() => useWillUnmount(callback));

        await unmount();

        expect(callback).toHaveBeenCalledTimes(1);
    });
});
