import { injectable } from "inversify";
import { createSignal } from "solid-js";
import { BaseViewModel } from "@m0n0lab/solid-clean";
import { getPublicOrderBoard } from "../server/data.ts";
import { createCoalescingRefetch } from "../services/coalescing-refetch.ts";
import { boardEventsUrl } from "../services/sse-url.ts";
import type { PublicOrderBoardResult } from "../server/data.ts";
import type { CoalescingRefetch } from "../services/coalescing-refetch.ts";
import type { PublicOrderBoardDto, PublicOrderSummaryDto } from "@m0n0lab/qup-shared";

export type BoardState = "loading" | "ready" | "not-found" | "ended" | "error";

// `visibleUntil` is absolute and server-issued; undefined means the order never expires.
function deadlineOf(order: PublicOrderSummaryDto): number | undefined {
    if (order.visibleUntil === null) return undefined;
    const at = Date.parse(order.visibleUntil);
    return Number.isNaN(at) ? undefined : at;
}

@injectable()
export class OrderBoardViewModel extends BaseViewModel {
    private readonly _state = createSignal<BoardState>("loading");
    private readonly _board = createSignal<PublicOrderBoardDto | undefined>(undefined);
    private readonly _error = createSignal("");
    private readonly _reconnecting = createSignal(false);
    private readonly _sessionEnded = createSignal(false);
    private _requestedCode = "";
    private _expiryTimer: ReturnType<typeof setTimeout> | undefined;
    private _refetch: CoalescingRefetch | null = null;
    private _signals: EventSource | null = null;

    get state() {
        return this._state[0];
    }
    get error() {
        return this._error[0];
    }
    /** The signal stream is down and the board is showing the last snapshot it got. */
    get reconnecting() {
        return this._reconnecting[0];
    }
    /** The session closed while the board was open: what is on screen is final. */
    get sessionEnded() {
        return this._sessionEnded[0];
    }

    setSessionCode(code: string): void {
        this._requestedCode = code.trim();
    }

    readonly sessionName = (): string => this._board[0]()?.sessionName ?? "";
    readonly sessionCode = (): string => this._board[0]()?.sessionCode ?? this._requestedCode;

    // The snapshot already arrives in board order (see GetPublicOrderBoardUseCase): the public
    // projection carries no timestamp, so the sections keep the order the server gave them and
    // never re-sort here.
    readonly pending = (): PublicOrderSummaryDto[] => this.section("PENDING");
    readonly preparing = (): PublicOrderSummaryDto[] => this.section("PREPARING");
    readonly recentlyServed = (): PublicOrderSummaryDto[] => this.section("DONE");
    readonly cancelled = (): PublicOrderSummaryDto[] => this.section("CANCELLED");

    // The cancelled strip counts: a session holding only cancelled orders would otherwise
    // show `No orders yet` above a populated strip.
    readonly hasVisibleOrders = (): boolean =>
        this.pending().length +
            this.preparing().length +
            this.recentlyServed().length +
            this.cancelled().length >
        0;

    override async didMount(): Promise<void> {
        this._error[1]("");

        if (!this._requestedCode) {
            this._state[1]("not-found");
            return;
        }

        this._state[1]("loading");
        this._refetch = createCoalescingRefetch({
            fetch: () => getPublicOrderBoard(this._requestedCode),
            apply: (result) => this.applySnapshot(result),
            onError: (e) => this.applyFailure(e),
        });
        this.addCleanup(() => this._refetch?.stop());

        await this._refetch.trigger();

        // Nothing to keep live unless the board actually loaded: a stream opened for a
        // missing or closed session only 404s or 409s, which would show `Reconnecting…`
        // underneath a `Session not found` the board is never going to recover from.
        if (this._state[0]() === "ready") {
            this.listenForSignals();
        }
    }

    override willUnmount(): void {
        this.clearExpiryTimer();
        super.willUnmount();
    }

    // Signals carry nothing, so they only ever mean "refetch". Coalescing keeps a burst of
    // them — a host advancing several orders at once — down to one extra request.
    private listenForSignals(): void {
        const signals = new EventSource(boardEventsUrl(this._requestedCode));

        signals.addEventListener("board:changed", () => void this._refetch?.trigger());
        signals.addEventListener("session:closed", () => this.freeze());

        signals.onopen = () => {
            if (!this._reconnecting[0]()) return;
            // Signals that arrived while the stream was down were missed entirely, so the
            // snapshot is the only way back to the truth.
            this._reconnecting[1](false);
            void this._refetch?.trigger();
        };
        signals.onerror = () => {
            // EventSource retries on its own; the board keeps its last known cards and
            // just says so. A frozen board has nothing left to reconnect for.
            if (this._sessionEnded[0]()) return;
            this._reconnecting[1](true);
        };

        this._signals = signals;
        this.addCleanup(() => this.stopListening());
    }

    private stopListening(): void {
        this._signals?.close();
        this._signals = null;
    }

    // Closure is terminal: the cards on screen stay exactly as they are, and the board
    // stops both refetching and reconnecting.
    private freeze(): void {
        this._sessionEnded[1](true);
        this._reconnecting[1](false);
        this._refetch?.stop();
        this.stopListening();
        // Frozen means frozen: without this the expiry timer keeps firing and the board
        // goes on dropping cards as their deadlines pass, after it stopped refetching.
        this.clearExpiryTimer();
    }

    private applySnapshot(result: PublicOrderBoardResult): void {
        if (result.status === "ok") {
            this._board[1](result.board);
            this.scheduleExpiry();
            this._state[1]("ready");
            return;
        }

        this.clearExpiryTimer();
        this._board[1](undefined);
        if (result.status === "error") {
            this._error[1](result.message);
        }
        this._state[1](result.status);
    }

    // Retention is the server's rule; this only keeps the screen honest between snapshots.
    // One timer armed at the nearest deadline, never a ticker: the board runs for hours on
    // a shared display, so it sleeps until something can actually change.
    private scheduleExpiry(): void {
        this.clearExpiryTimer();

        const next = this.nextDeadline();
        if (next === undefined) return;

        this._expiryTimer = setTimeout(
            () => {
                this._expiryTimer = undefined;
                this.dropExpired();
                this.scheduleExpiry();
            },
            Math.max(0, next - Date.now()),
        );
    }

    private clearExpiryTimer(): void {
        if (this._expiryTimer === undefined) return;
        clearTimeout(this._expiryTimer);
        this._expiryTimer = undefined;
    }

    private nextDeadline(): number | undefined {
        const deadlines = this.orders()
            .map(deadlineOf)
            .filter((at): at is number => at !== undefined);
        return deadlines.length > 0 ? Math.min(...deadlines) : undefined;
    }

    private dropExpired(): void {
        const board = this._board[0]();
        if (!board) return;

        const now = Date.now();
        const visible = board.orders.filter((order) => (deadlineOf(order) ?? Infinity) > now);

        if (visible.length !== board.orders.length) {
            this._board[1]({ ...board, orders: visible });
        }
    }

    private orders(): PublicOrderSummaryDto[] {
        return this._board[0]()?.orders ?? [];
    }

    private applyFailure(error: unknown): void {
        // A refetch that never reached the server leaves the last known board up; only the
        // first load, which has nothing to show yet, falls back to the error state.
        if (this._board[0]()) return;
        this._error[1](error instanceof Error ? error.message : "Failed to load the board");
        this._state[1]("error");
    }

    private section(status: PublicOrderSummaryDto["status"]): PublicOrderSummaryDto[] {
        return this.orders().filter((order) => order.status === status);
    }
}
