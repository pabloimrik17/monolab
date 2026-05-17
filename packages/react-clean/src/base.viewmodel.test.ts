import { Subscription } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { BaseViewModel } from "./base.viewmodel.ts";

// Test concrete implementation since BaseViewModel is abstract
class TestViewModel extends BaseViewModel {}

describe("BaseViewModel", () => {
    it("should be instantiable", () => {
        const viewModel = new TestViewModel();

        expect(viewModel).toBeInstanceOf(BaseViewModel);
    });

    it("should have lifecycle methods", () => {
        const viewModel = new TestViewModel();

        expect(viewModel.didMount).toBeDefined();
        expect(typeof viewModel.didMount).toBe("function");
        expect(viewModel.willUnmount).toBeDefined();
        expect(typeof viewModel.willUnmount).toBe("function");
    });

    it("should add subscriptions via addSub", () => {
        const viewModel = new TestViewModel();
        const unsubscribeFn1 = vi.fn();
        const unsubscribeFn2 = vi.fn();
        const sub1 = new Subscription(unsubscribeFn1);
        const sub2 = new Subscription(unsubscribeFn2);

        viewModel.addSub(sub1, sub2);

        // Verify subscriptions are not yet unsubscribed
        expect(unsubscribeFn1).not.toHaveBeenCalled();
        expect(unsubscribeFn2).not.toHaveBeenCalled();

        // Cleanup should unsubscribe all
        viewModel.willUnmount();

        expect(unsubscribeFn1).toHaveBeenCalledTimes(1);
        expect(unsubscribeFn2).toHaveBeenCalledTimes(1);
    });

    it("should unsubscribe all subscriptions on willUnmount", () => {
        const viewModel = new TestViewModel();
        const unsubscribeFn = vi.fn();
        const sub = new Subscription(unsubscribeFn);

        viewModel.addSub(sub);
        viewModel.willUnmount();

        expect(unsubscribeFn).toHaveBeenCalledTimes(1);
    });

    it("should reset composite subscription after willUnmount", () => {
        const viewModel = new TestViewModel();
        const unsubscribeFn1 = vi.fn();
        const unsubscribeFn2 = vi.fn();
        const sub1 = new Subscription(unsubscribeFn1);

        viewModel.addSub(sub1);
        viewModel.willUnmount();

        // Add new subscription after unmount
        const sub2 = new Subscription(unsubscribeFn2);
        viewModel.addSub(sub2);
        viewModel.willUnmount();

        // First subscription should not be called again
        expect(unsubscribeFn1).toHaveBeenCalledTimes(1);
        // Second subscription should be called
        expect(unsubscribeFn2).toHaveBeenCalledTimes(1);
    });
});
