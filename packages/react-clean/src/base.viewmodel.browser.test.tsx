import { useDidMount, useWillUnmount } from "@monolab/react-hooks";
import { render } from "@testing-library/react";
import { Container, injectable } from "inversify";
import { useState } from "react";
import { BehaviorSubject } from "rxjs";
import { expect, test } from "vitest";
import { BaseViewModel } from "./base.viewmodel.js";

// Concrete ViewModel for testing
@injectable()
class TestViewModel extends BaseViewModel {
    private _count$ = new BehaviorSubject<number>(0);
    count$ = this._count$.asObservable();

    increment() {
        this._count$.next(this._count$.value + 1);
    }

    override didMount() {
        // Simulate some initialization
        this._count$.next(1);
    }

    override willUnmount() {
        super.willUnmount();
        this._count$.complete();
    }
}

// Component using the ViewModel
function TestComponent({ viewModel }: { viewModel: TestViewModel }) {
    const [count, setCount] = useState(0);

    useDidMount(() => {
        viewModel.didMount();
        const sub = viewModel.count$.subscribe(setCount);
        viewModel.addSub(sub);
    });

    useWillUnmount(() => {
        viewModel.willUnmount();
    });

    return (
        <div>
            <span data-testid="count">{count}</span>
            <button onClick={() => viewModel.increment()}>Increment</button>
        </div>
    );
}

test("BaseViewModel lifecycle works in real browser", () => {
    const container = new Container();
    container.bind(TestViewModel).toSelf();
    const viewModel = container.get(TestViewModel);

    const { getByTestId } = render(<TestComponent viewModel={viewModel} />);

    // After mount, count should be initialized to 1
    const countElement = getByTestId("count");
    expect(countElement.textContent).toBe("1");

    // Verify we're in real browser environment
    expect(typeof window).toBe("object");
    expect(typeof localStorage).toBe("object");
});

test("BaseViewModel addSub manages subscriptions in browser", () => {
    const container = new Container();
    container.bind(TestViewModel).toSelf();
    const viewModel = container.get(TestViewModel);

    const { unmount } = render(<TestComponent viewModel={viewModel} />);

    // Increment to verify subscription is active
    viewModel.increment();

    // Unmount should trigger willUnmount and clean up subscriptions
    unmount();

    // After unmount, observable should be completed
    let emitted = false;
    viewModel.count$.subscribe({
        next: () => {
            emitted = true;
        },
        error: () => {},
        complete: () => {},
    });

    expect(emitted).toBe(false);
});
