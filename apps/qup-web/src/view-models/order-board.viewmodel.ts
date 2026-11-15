import { injectable } from "inversify";
import { createSignal } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { BaseViewModel } from "@m0n0lab/solid-clean";
import { getPublicOrderBoard } from "../server/data.ts";
import { createCoalescingRefetch } from "../services/coalescing-refetch.ts";
import { boardEventsUrl } from "../services/sse-url.ts";
import type { PublicOrderBoardResult } from "../server/data.ts";
import type { CoalescingRefetch } from "../services/coalescing-refetch.ts";
import type { PublicOrderBoardDto, PublicOrderSummaryDto } from "@m0n0lab/qup-shared";

export type BoardState = "loading" | "ready" | "not-found" | "ended" | "error";

// How long a newly arrived order stays visually highlighted.
const HIGHLIGHT_DURATION_MS = 2400;

// `visibleUntil` is absolute and server-issued; undefined means the order never expires.
function deadlineOf(order: PublicOrderSummaryDto): number | undefined {
    if (order.visibleUntil === null) return undefined;
    const at = Date.parse(order.visibleUntil);
    return Number.isNaN(at) ? undefined : at;
}

@injectable()
export class OrderBoardViewModel extends BaseViewModel {
    private readonly _state = createSignal<BoardState>("loading");
    private readonly _board = createStore<PublicOrderBoardDto>({
        sessionName: "",
        sessionCode: "",
        orders: [],
    });
    private readonly _error = createSignal("");
    private readonly _reconnecting = createSignal(false);
    private readonly _sessionEnded = createSignal(false);
    private readonly _fullscreen = createSignal(false);
    // Which order ids are mid-highlight right now, keyed by id so BoardCard can look itself up.
    private readonly _highlighted = createSignal<ReadonlySet<string>>(new Set());
    private _requestedCode = "";
    private _hasBoard = false;
    private _expiryTimer: ReturnType<typeof setTimeout> | undefined;
    private _refetch: CoalescingRefetch | null = null;
    private _signals: EventSource | null = null;
    private _wakeLock: WakeLockSentinel | null = null;
    // Ids seen in the last snapshot, so the next one can tell who's new.
    private _knownOrderIds = new Set<string>();
    private readonly _highlightTimers = new Map<string, ReturnType<typeof setTimeout>>();

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
    get isFullscreen() {
        return this._fullscreen[0];
    }

    setSessionCode(code: string): void {
        this._requestedCode = code.trim();
    }

    readonly sessionName = (): string => this._board[0].sessionName;
    readonly sessionCode = (): string => this._board[0].sessionCode || this._requestedCode;

    // The snapshot already arrives in board order (see GetPublicOrderBoardUseCase): the public
    // projection carries no timestamp, so the sections keep the order the server gave them and
    // never re-sort here.
    readonly pending = (): PublicOrderSummaryDto[] => this.section("PENDING");
    readonly preparing = (): PublicOrderSummaryDto[] => this.section("PREPARING");
    readonly recentlyServed = (): PublicOrderSummaryDto[] => this.section("DONE");
    readonly cancelled = (): PublicOrderSummaryDto[] => this.section("CANCELLED");

    // Every order currently held spans exactly the four statuses above, cancelled included:
    // a session holding only cancelled orders would otherwise show `No orders yet` above a
    // populated strip.
    readonly hasVisibleOrders = (): boolean => this._board[0].orders.length > 0;

    /** Whether this order just arrived and should still be showing its brief highlight. */
    readonly isHighlighted = (id: string): boolean => this._highlighted[0]().has(id);

    override async didMount(): Promise<void> {
        this._error[1]("");
        this.watchFullscreen();

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
            this.enterSharedDisplayMode();
        }
    }

    override willUnmount(): void {
        this.clearExpiryTimer();
        this.clearHighlightTimers();
        this.releaseWakeLock();
        super.willUnmount();
    }

    // --- Fullscreen -----------------------------------------------------------------------

    private watchFullscreen(): void {
        const onChange = () => this._fullscreen[1](document.fullscreenElement !== null);
        document.addEventListener("fullscreenchange", onChange);
        this.addCleanup(() => document.removeEventListener("fullscreenchange", onChange));
    }

    enterFullscreen(): void {
        if (typeof document.documentElement.requestFullscreen !== "function") return;
        void document.documentElement.requestFullscreen().catch(() => {});
    }

    // --- Shared-display wake lock -----------------------------------------------------------

    private enterSharedDisplayMode(): void {
        void this.requestWakeLock();

        // The wake lock is released by the browser whenever the tab is hidden; re-request it
        // once the tablet's screen comes back, rather than trying to hold it through a hide.
        const onVisibilityChange = () => {
            if (document.visibilityState === "visible") void this.requestWakeLock();
        };
        document.addEventListener("visibilitychange", onVisibilityChange);
        this.addCleanup(() => document.removeEventListener("visibilitychange", onVisibilityChange));
    }

    private async requestWakeLock(): Promise<void> {
        if (!("wakeLock" in navigator)) return;
        try {
            this._wakeLock = await navigator.wakeLock.request("screen");
        } catch {
            // Denied, no user activation yet, battery saver, etc. — the board still works.
            this._wakeLock = null;
        }
    }

    private releaseWakeLock(): void {
        const lock = this._wakeLock;
        this._wakeLock = null;
        void lock?.release().catch(() => {});
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
        // A board showing `Session ended` has no reason to keep the screen awake.
        this.releaseWakeLock();
    }

    private applySnapshot(result: PublicOrderBoardResult): void {
        if (result.status === "ok") {
            this.trackArrivals(result.board.orders);
            this._board[1]("sessionName", result.board.sessionName);
            this._board[1]("sessionCode", result.board.sessionCode);
            // Keyed reconciliation: orders whose id is unchanged keep their identity instead
            // of being torn down and rebuilt, which is what lets a status change animate as a
            // move rather than a remount, and lets the highlight below target real arrivals.
            this._board[1]("orders", reconcile(result.board.orders, { key: "id" }));
            this._hasBoard = true;
            this.scheduleExpiry();
            this._state[1]("ready");
            return;
        }

        this.clearExpiryTimer();
        this._hasBoard = false;
        this._board[1]("orders", []);
        if (result.status === "error") {
            this._error[1](result.message);
        }
        this._state[1](result.status);
    }

    // Highlights any order id that wasn't in the previous snapshot. The very first snapshot
    // never highlights anything — those orders were already there, not "just arrived".
    private trackArrivals(orders: PublicOrderSummaryDto[]): void {
        const previouslyKnown = this._knownOrderIds;
        this._knownOrderIds = new Set(orders.map((order) => order.id));

        if (!this._hasBoard) return;

        for (const order of orders) {
            if (!previouslyKnown.has(order.id)) this.highlight(order.id);
        }
    }

    private highlight(id: string): void {
        const existingTimer = this._highlightTimers.get(id);
        if (existingTimer !== undefined) clearTimeout(existingTimer);

        const next = new Set(this._highlighted[0]());
        next.add(id);
        this._highlighted[1](next);

        this._highlightTimers.set(
            id,
            setTimeout(() => this.unhighlight(id), HIGHLIGHT_DURATION_MS),
        );
    }

    private unhighlight(id: string): void {
        this._highlightTimers.delete(id);
        const next = new Set(this._highlighted[0]());
        if (next.delete(id)) this._highlighted[1](next);
    }

    private clearHighlightTimers(): void {
        for (const timer of this._highlightTimers.values()) clearTimeout(timer);
        this._highlightTimers.clear();
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
        const deadlines = this._board[0].orders
            .map(deadlineOf)
            .filter((at): at is number => at !== undefined);
        return deadlines.length > 0 ? Math.min(...deadlines) : undefined;
    }

    private dropExpired(): void {
        if (!this._hasBoard) return;

        const now = Date.now();
        const orders = this._board[0].orders;
        const visible = orders.filter((order) => (deadlineOf(order) ?? Infinity) > now);

        if (visible.length !== orders.length) {
            this._board[1]("orders", reconcile(visible, { key: "id" }));
        }
    }

    private applyFailure(error: unknown): void {
        // A refetch that never reached the server leaves the last known board up; only the
        // first load, which has nothing to show yet, falls back to the error state.
        if (this._hasBoard) return;
        this._error[1](error instanceof Error ? error.message : "Failed to load the board");
        this._state[1]("error");
    }

    private section(status: PublicOrderSummaryDto["status"]): PublicOrderSummaryDto[] {
        return this._board[0].orders.filter((order) => order.status === status);
    }
}
