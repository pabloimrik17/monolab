import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDidMount } from "./use-did-mount.hook.js";

describe("useDidMount", () => {
    it("should call callback on mount", async () => {
        const callback = vi.fn();

        renderHook(() => useDidMount(callback));

        // Wait for async execution
        await vi.waitFor(
            () => {
                expect(callback).toHaveBeenCalledTimes(1);
            },
            { timeout: 100 }
        );
    });

    it("should not call callback on re-render", async () => {
        const callback = vi.fn();

        const { rerender } = renderHook(() => useDidMount(callback));

        await vi.waitFor(
            () => {
                expect(callback).toHaveBeenCalledTimes(1);
            },
            { timeout: 100 }
        );

        rerender();

        // Wait a bit to ensure no additional calls
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should handle async callback", async () => {
        const callback = vi.fn().mockResolvedValue(undefined);

        renderHook(() => useDidMount(callback));

        await vi.waitFor(
            () => {
                expect(callback).toHaveBeenCalledTimes(1);
            },
            { timeout: 100 }
        );
    });

    it("should catch and log errors from callback", async () => {
        const consoleErrorSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});
        const error = new Error("Test error");
        const callback = vi.fn().mockRejectedValue(error);

        renderHook(() => useDidMount(callback));

        await vi.waitFor(
            () => {
                expect(callback).toHaveBeenCalledTimes(1);
                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    "[useDidMount] error",
                    error
                );
            },
            { timeout: 100 }
        );

        consoleErrorSpy.mockRestore();
    });
});
