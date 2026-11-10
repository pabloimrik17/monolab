import { describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { useDidMount, useWillUnmount } from "../index.ts";
import type { FC } from "react";

interface LifecycleProps {
    label: string;
    onMount: () => void;
    onUnmount: () => void;
}

const Lifecycle: FC<LifecycleProps> = ({ label, onMount, onUnmount }) => {
    useDidMount(onMount);
    useWillUnmount(onUnmount);
    return <p>{label}</p>;
};

describe("lifecycle", () => {
    test("runs mount and unmount callbacks once each, never on re-render", async () => {
        const onMount = vi.fn();
        const onUnmount = vi.fn();
        // Fresh callback identities on every render must not re-trigger either hook.
        const view = (label: string) => (
            <Lifecycle
                label={label}
                onMount={() => onMount()}
                onUnmount={() => onUnmount()}
            />
        );

        const screen = await render(view("first"));
        await screen.rerender(view("second"));

        await expect.element(screen.getByText("second")).toBeVisible();
        expect(onMount).toHaveBeenCalledOnce();
        expect(onUnmount).not.toHaveBeenCalled();

        await screen.unmount();

        expect(onUnmount).toHaveBeenCalledOnce();
    });
});
