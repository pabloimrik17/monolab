import { useDidMount, useWillUnmount } from "@monolab/react-hooks";
import { useRef } from "react";
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
    const instanceRef = useRef<T | null>(null);
    if (instanceRef.current === null) {
        instanceRef.current = viewModel();
    }

    useDidMount(async () => {
        await instanceRef.current!.didMount();
    });

    useWillUnmount(() => {
        instanceRef.current!.willUnmount();
    });

    return instanceRef.current!;
};
