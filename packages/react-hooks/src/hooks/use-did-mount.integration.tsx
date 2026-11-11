import { useState, type FC } from "react";
import { beforeAll, describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { useDidMount } from "./use-did-mount.hook.ts";

describe("useDidMount", () => {
    // Verify browser environment is properly configured
    beforeAll(() => {
        expect(typeof window).toBe("object");
        expect(typeof document).toBe("object");
    });

    interface TestComponentProps {
        onMount: () => void;
    }

    // Component using useDidMount hook
    const TestComponent: FC<TestComponentProps> = ({ onMount }) => {
        const [mounted, setMounted] = useState(false);

        useDidMount(() => {
            setMounted(true);
            onMount();
        });

        return <div data-testid="status">{mounted ? "mounted" : "not-mounted"}</div>;
    };

    test("useDidMount executes callback once after mount in real browser", async () => {
        let callCount = 0;
        const onMount = () => {
            callCount++;
        };

        const screen = await render(<TestComponent onMount={onMount} />);

        // In a real browser environment we assert against the live DOM via locators
        await expect.element(screen.getByTestId("status")).toHaveTextContent("mounted");
        expect(callCount).toBe(1);
    });

    test("useDidMount with async callback in browser", async () => {
        let resolved = false;
        const asyncOnMount = async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            resolved = true;
        };

        const screen = await render(<TestComponent onMount={asyncOnMount} />);

        // Wait for the async callback to complete
        await vi.waitFor(
            () => {
                expect(resolved).toBe(true);
            },
            { timeout: 100 },
        );

        // Verify the component mounted
        await expect.element(screen.getByTestId("status")).toHaveTextContent("mounted");
    });
});
