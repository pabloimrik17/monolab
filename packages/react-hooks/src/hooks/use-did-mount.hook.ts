import { useEffect } from "react";

/**
 * A React hook that executes a given function only once after the component
 * is mounted, effectively replicating the behavior of the componentDidMount
 * lifecycle method in class-based components.
 *
 * @param {() => Promise<void> | void} didMountFn - A callback function
 * to be executed once after the component is mounted. This function can
 * optionally return a promise for asynchronous operations.
 *
 * @returns {void}
 */
export const useDidMount = (didMountFn: () => Promise<void> | void): void => {
    useEffect(() => {
        async function execute(): Promise<void> {
            await didMountFn();
        }

        void execute();
    }, []);
};
