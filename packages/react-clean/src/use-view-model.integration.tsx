import { useState } from "react";
import { type Observable, Subject } from "rxjs";
import { expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { BaseViewModel, useViewModel } from "./index.ts";

type TickListener = (tick: number) => void;

class TickerViewModel extends BaseViewModel {
    private readonly ticks$: Observable<number>;
    private readonly onTick: TickListener;

    constructor(ticks$: Observable<number>, onTick: TickListener) {
        super();
        this.ticks$ = ticks$;
        this.onTick = onTick;
    }

    override didMount(): void {
        this.addSub(this.ticks$.subscribe(this.onTick));
    }
}

function Ticker({
    createViewModel,
}: {
    createViewModel: (onTick: TickListener) => TickerViewModel;
}) {
    const [tick, setTick] = useState(0);
    useViewModel(() => createViewModel(setTick));
    return <output>{tick}</output>;
}

test("creates the view model once and releases its subscriptions on unmount", async () => {
    const ticks$ = new Subject<number>();
    const createViewModel = vi.fn((onTick: TickListener) => new TickerViewModel(ticks$, onTick));

    const screen = await render(<Ticker createViewModel={createViewModel} />);
    ticks$.next(1);
    await expect.element(screen.getByRole("status")).toHaveTextContent("1");
    await screen.rerender(<Ticker createViewModel={createViewModel} />);

    expect(createViewModel).toHaveBeenCalledOnce();
    expect(ticks$.observed).toBe(true);

    await screen.unmount();

    expect(ticks$.observed).toBe(false);
});
