import { useEffect } from "react";

export const useDidMount = (didMountFn: () => Promise<void> | void): void => {
    useEffect(() => {
        async function execute(): Promise<void> {
            await didMountFn();
        }

        void execute();
    }, []);
};
