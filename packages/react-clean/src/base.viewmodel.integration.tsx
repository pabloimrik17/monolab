import { Container, injectable } from "inversify";
import { useState, type FC } from "react";
import { BehaviorSubject } from "rxjs";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { useDidMount, useWillUnmount } from "@m0n0lab/react-hooks";
import { BaseViewModel } from "./base.viewmodel.ts";

@injectable()
class TestViewModel extends BaseViewModel {
    private _count$ = new BehaviorSubject<number>(0);
    count$ = this._count$.asObservable();

    increment() {
        this._count$.next(this._count$.value + 1);
    }

    override didMount() {
        this._count$.next(1);
    }

    override willUnmount() {
        super.willUnmount();
        this._count$.complete();
    }
}

interface TestComponentProps {
    viewModel: TestViewModel;
}

const TestComponent: FC<TestComponentProps> = ({ viewModel }) => {
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
};

describe("BaseViewModel", () => {
    test("BaseViewModel lifecycle works in real browser", async () => {
        const container = new Container();
        container.bind(TestViewModel).toSelf();
        const viewModel = container.get(TestViewModel);

        const screen = await render(<TestComponent viewModel={viewModel} />);

        await expect.element(screen.getByTestId("count")).toHaveTextContent("1");

        expect(typeof window).toBe("object");
        expect(typeof localStorage).toBe("object");
    });

    test("BaseViewModel addSub manages subscriptions in browser", async () => {
        const container = new Container();
        container.bind(TestViewModel).toSelf();
        const viewModel = container.get(TestViewModel);

        const { unmount } = await render(<TestComponent viewModel={viewModel} />);

        viewModel.increment();

        await unmount();

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
});
