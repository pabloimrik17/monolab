import { createRoot } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { BaseViewModel } from "./base.viewmodel.ts";
import { useViewModel } from "./use-view-model.hook.ts";
import type { Owner } from "solid-js";

class TestViewModel extends BaseViewModel {
    mountedOwner: Owner | undefined;
    mountCalled = false;
    unmountCalled = false;

    override didMount(owner?: Owner): void {
        this.mountCalled = true;
        this.mountedOwner = owner;
    }

    override willUnmount(): void {
        this.unmountCalled = true;
        super.willUnmount();
    }
}

describe("useViewModel", () => {
    it("should call factory once and return the viewmodel", () => {
        createRoot((dispose) => {
            const factory = vi.fn(() => new TestViewModel());
            const vm = useViewModel(factory);

            expect(factory).toHaveBeenCalledOnce();
            expect(vm).toBeInstanceOf(TestViewModel);
            dispose();
        });
    });

    it("should call didMount on mount with owner", async () => {
        const vm = await new Promise<TestViewModel>((resolve) => {
            createRoot((dispose) => {
                const instance = useViewModel(() => new TestViewModel());
                // onMount runs synchronously inside createRoot for Solid
                queueMicrotask(() => {
                    resolve(instance);
                    dispose();
                });
            });
        });

        expect(vm.mountCalled).toBe(true);
        expect(vm.mountedOwner).toBeDefined();
    });

    it("should call willUnmount on cleanup", () => {
        let vmRef: TestViewModel | undefined;

        createRoot((dispose) => {
            vmRef = useViewModel(() => new TestViewModel());
            dispose();
        });

        expect(vmRef!.unmountCalled).toBe(true);
    });
});
