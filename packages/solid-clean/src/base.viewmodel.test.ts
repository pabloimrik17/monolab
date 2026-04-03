import { describe, expect, it, vi } from "vitest";
import { BaseViewModel } from "./base.viewmodel.ts";
import type { Owner } from "solid-js";

class TestViewModel extends BaseViewModel {}

describe("BaseViewModel", () => {
    it("should execute added cleanups on willUnmount", () => {
        const vm = new TestViewModel();
        const fn1 = vi.fn();
        const fn2 = vi.fn();

        vm.addCleanup(fn1, fn2);
        vm.willUnmount();

        expect(fn1).toHaveBeenCalledOnce();
        expect(fn2).toHaveBeenCalledOnce();
    });

    it("should reset cleanups after willUnmount", () => {
        const vm = new TestViewModel();
        const fn = vi.fn();

        vm.addCleanup(fn);
        vm.willUnmount();
        vm.willUnmount();

        expect(fn).toHaveBeenCalledOnce();
    });

    it("should handle willUnmount with no cleanups", () => {
        const vm = new TestViewModel();
        expect(() => vm.willUnmount()).not.toThrow();
    });

    it("should call didMount with owner", async () => {
        const owner = {} as Owner;

        class MountVM extends BaseViewModel {
            mountedOwner: Owner | undefined;
            override didMount(o?: Owner): void {
                this.mountedOwner = o;
            }
        }

        const vm = new MountVM();
        vm.didMount(owner);

        expect(vm.mountedOwner).toBe(owner);
    });

    it("should call didMount without owner", () => {
        class MountVM extends BaseViewModel {
            mountCalled = false;
            override didMount(): void {
                this.mountCalled = true;
            }
        }

        const vm = new MountVM();
        vm.didMount();

        expect(vm.mountCalled).toBe(true);
    });

    it("should support async didMount", async () => {
        class AsyncVM extends BaseViewModel {
            value = 0;
            override async didMount(): Promise<void> {
                this.value = await Promise.resolve(42);
            }
        }

        const vm = new AsyncVM();
        await vm.didMount();

        expect(vm.value).toBe(42);
    });
});
