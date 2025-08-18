import { useDidMount, useWillUnmount } from "@monolab/react-hooks";
import { useState } from "react";
import { BaseViewModel } from "./base.viewmodel.js";

/**
 * A custom React hook for managing lifecycle events of a `BaseViewModel` instance.
 *
 * This hook initializes a `BaseViewModel` instance, invokes its `didMount` lifecycle method
 * during the component's mount phase, and ensures its `willUnmount` lifecycle method is
 * called during the component's unmount phase. It simplifies the integration of
 * `BaseViewModel` instances with React components.
 *
 * @template T Extends the `BaseViewModel` type.
 * @param {() => T} viewModel A factory function that returns a new instance of a class
 * that extends `BaseViewModel`.
 * @returns {T} The initialized `BaseViewModel` instance.
 */
export const useViewModel = <T extends BaseViewModel>(
    viewModel: () => T
): T => {
    const [instance] = useState<T>(() => viewModel());

    useDidMount(async () => {
        await instance.didMount();
    });

    useWillUnmount(() => {
        instance.willUnmount();
    });

    return instance;
};
