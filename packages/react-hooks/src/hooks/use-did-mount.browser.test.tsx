import { render } from "@testing-library/react";
import { useState } from "react";
import { expect, test } from "vitest";
import { useDidMount } from "./use-did-mount.hook.js";

// Component using useDidMount hook
function TestComponent({ onMount }: { onMount: () => void }) {
    const [mounted, setMounted] = useState(false);

    useDidMount(() => {
        setMounted(true);
        onMount();
    });

    return (
        <div data-testid="status">{mounted ? "mounted" : "not-mounted"}</div>
    );
}

test("useDidMount executes callback once after mount in real browser", () => {
    let callCount = 0;
    const onMount = () => {
        callCount++;
    };

    const { getByTestId } = render(<TestComponent onMount={onMount} />);

    // In real browser environment, we can access actual DOM
    const element = getByTestId("status");
    expect(element.textContent).toBe("mounted");
    expect(callCount).toBe(1);

    // Verify we're running in actual browser (window exists)
    expect(typeof window).toBe("object");
    expect(typeof document).toBe("object");
});

test("useDidMount with async callback in browser", async () => {
    let resolved = false;
    const asyncOnMount = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        resolved = true;
    };

    render(<TestComponent onMount={asyncOnMount} />);

    // Wait for async operation
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(resolved).toBe(true);
});
