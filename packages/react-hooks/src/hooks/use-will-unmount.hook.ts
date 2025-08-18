import { useEffect } from "react";

export const useWillUnmount = (
    willIUnmountFn: () => Promise<void> | void
): void => {
    useEffect(() => (): void => void willIUnmountFn(), []);
};
