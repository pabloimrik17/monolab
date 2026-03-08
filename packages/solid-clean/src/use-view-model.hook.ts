import { getOwner, onCleanup, onMount } from "solid-js";
import type { BaseViewModel } from "./base.viewmodel.ts";

export function useViewModel<T extends BaseViewModel>(factory: () => T): T {
    const vm = factory();
    const owner = getOwner();

    onMount(() => {
        vm.didMount(owner ?? undefined);
    });

    onCleanup(() => {
        vm.willUnmount();
    });

    return vm;
}
