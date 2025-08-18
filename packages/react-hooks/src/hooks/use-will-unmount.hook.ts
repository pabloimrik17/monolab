import { useEffect } from "react";

/**
 * A utility function that registers a cleanup effect to be invoked when a component unmounts.
 *
 * @param {function(): (Promise<void>|void)} willIUnmountFn - A callback function to be executed during the component's unmount phase.
 * It can optionally return a Promise for asynchronous operations or execute synchronous cleanup tasks.
 *
 * @returns {void} This function does not return any value.
 *
 * @description This hook is shorthand for a common pattern of using the `useEffect` hook
 * with an empty dependency array to ensure that cleanup logic executes when a component is
 * unmounted. The provided callback function is invoked during the unmounting process to
 * handle any necessary resource release, cleanup, or other teardown logic.
 */
export const useWillUnmount = (
    willIUnmountFn: () => Promise<void> | void
): void => {
    useEffect(() => (): void => void willIUnmountFn(), []);
};
