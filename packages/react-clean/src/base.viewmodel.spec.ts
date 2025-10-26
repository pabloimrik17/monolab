import { describe, expect, it } from "vitest";
import { BaseViewModel } from "./base.viewmodel.js";

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

    it("should have subscription management", () => {
        const viewModel = new TestViewModel();

        expect(viewModel.addSub).toBeDefined();
        expect(typeof viewModel.addSub).toBe("function");
    });
});
