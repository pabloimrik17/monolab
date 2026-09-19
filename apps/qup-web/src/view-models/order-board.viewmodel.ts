import { injectable } from "inversify";
import { createSignal } from "solid-js";
import { BaseViewModel } from "@m0n0lab/solid-clean";
import { getPublicOrderBoard } from "../server/data.ts";
import type { PublicOrderBoardResult } from "../server/data.ts";
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
    private _requestedCode = "";
    private _expiryTimer: ReturnType<typeof setTimeout> | undefined;

    get state() {
        return this._state[0];
    }
    get error() {
        return this._error[0];
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

    readonly hasVisibleOrders = (): boolean =>
        this.pending().length + this.preparing().length + this.recentlyServed().length > 0;

    override async didMount(): Promise<void> {
        this._error[1]("");

        if (!this._requestedCode) {
            this._state[1]("not-found");
            return;
        }

        this._state[1]("loading");
        try {
            this.applySnapshot(await getPublicOrderBoard(this._requestedCode));
        } catch (e) {
            this._error[1](e instanceof Error ? e.message : "Failed to load the board");
            this._state[1]("error");
        }
    }

    override willUnmount(): void {
        this.clearExpiryTimer();
        super.willUnmount();
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

    private section(status: PublicOrderSummaryDto["status"]): PublicOrderSummaryDto[] {
        return this.orders().filter((order) => order.status === status);
    }
}
