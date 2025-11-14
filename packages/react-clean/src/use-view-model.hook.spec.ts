import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BaseViewModel } from "./base.viewmodel.ts";
import { useViewModel } from "./use-view-model.hook.ts";

class TestViewModel extends BaseViewModel {
    override didMount = vi.fn().mockResolvedValue(undefined);
    override willUnmount = vi.fn();
}

describe("useViewModel", () => {
    it("should create viewmodel instance on first render", () => {
        const factory = vi.fn(() => new TestViewModel());

        const { result } = renderHook(() => useViewModel(factory));

        expect(factory).toHaveBeenCalledTimes(1);
        expect(result.current).toBeInstanceOf(TestViewModel);
    });

    it("should reuse same instance on re-render", () => {
        const factory = vi.fn(() => new TestViewModel());

        const { result, rerender } = renderHook(() => useViewModel(factory));

        const firstInstance = result.current;

        rerender();

        expect(factory).toHaveBeenCalledTimes(1);
        expect(result.current).toBe(firstInstance);
    });

    it("should call didMount on mount", async () => {
        const viewModel = new TestViewModel();
        const factory = () => viewModel;

        renderHook(() => useViewModel(factory));

        await vi.waitFor(() => {
            expect(viewModel.didMount).toHaveBeenCalledTimes(1);
        });
    });

    it("should call willUnmount on unmount", async () => {
        const viewModel = new TestViewModel();
        const factory = () => viewModel;

        const { unmount } = renderHook(() => useViewModel(factory));

        await vi.waitFor(() => {
            expect(viewModel.didMount).toHaveBeenCalledTimes(1);
        });

        unmount();

        expect(viewModel.willUnmount).toHaveBeenCalledTimes(1);
    });

    it("should not call lifecycle methods on re-render", async () => {
        const viewModel = new TestViewModel();
        const factory = () => viewModel;

        const { rerender } = renderHook(() => useViewModel(factory));

        await vi.waitFor(() => {
            expect(viewModel.didMount).toHaveBeenCalledTimes(1);
        });

        rerender();

        // Should still be called only once
        expect(viewModel.didMount).toHaveBeenCalledTimes(1);
        expect(viewModel.willUnmount).not.toHaveBeenCalled();
    });
});
