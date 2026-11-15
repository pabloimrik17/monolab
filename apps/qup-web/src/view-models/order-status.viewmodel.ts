import { injectable } from "inversify";
import { createSignal } from "solid-js";
import { BaseViewModel } from "@m0n0lab/solid-clean";
import { getPublicGuestOrders } from "../server/data.ts";
import { createCoalescingRefetch } from "../services/coalescing-refetch.ts";
import { sessionEventsUrl } from "../services/sse-url.ts";
import type { CoalescingRefetch } from "../services/coalescing-refetch.ts";
import type { PublicOrderSummaryDto } from "@m0n0lab/qup-shared";

// The stream carries no payload, so all three names mean the same thing here: something in
// the session moved, ask the server what this guest's orders look like now.
const ORDER_EVENTS = ["order:created", "order:status", "order:cancelled"] as const;

@injectable()
export class OrderStatusViewModel extends BaseViewModel {
    private readonly _loading = createSignal(false);
    private readonly _error = createSignal("");
    private readonly _orders = createSignal<PublicOrderSummaryDto[]>([]);
    private _sessionCode = "";
    private _guestName = "";
    private _refetch: CoalescingRefetch | null = null;
    private _eventSource: EventSource | null = null;

    get loading() {
        return this._loading[0];
    }
    get error() {
        return this._error[0];
    }
    get orders() {
        return this._orders[0];
    }

    setSessionCode(code: string): void {
        this._sessionCode = code;
    }

    setGuestName(name: string): void {
        this._guestName = name;
    }

    override async didMount(): Promise<void> {
        // The server does the filtering and refuses the read without a name, so there is
        // nothing to ask for until the screen knows whose orders these are.
        if (!this._guestName) {
            this._error[1]("Add your name to the link to see your orders");
            return;
        }

        this._loading[1](true);
        this._refetch = createCoalescingRefetch({
            fetch: () => getPublicGuestOrders(this._sessionCode, this._guestName),
            // `visibleUntil` rides along on the shared public projection and is deliberately
            // ignored: retention is a board concern, and a guest sees their own orders
            // however long ago they were served.
            apply: (orders) => this._orders[1](orders),
            onError: (e) =>
                this._error[1](e instanceof Error ? e.message : "Failed to load orders"),
        });
        this.addCleanup(() => this._refetch?.stop());

        await this._refetch.trigger();
        this._loading[1](false);

        // A stream opened for a session this screen could not read only errors; nothing to
        // keep live until the first read has actually landed.
        if (!this._error[0]()) {
            this.connectSSE();
        }
    }

    private connectSSE(): void {
        const es = new EventSource(sessionEventsUrl(this._sessionCode));

        // The API sends named SSE events, which never reach `onmessage`.
        for (const event of ORDER_EVENTS) {
            es.addEventListener(event, () => void this._refetch?.trigger());
        }

        es.onerror = () => {
            // EventSource auto-reconnects; the screen keeps the orders it last read.
        };

        this._eventSource = es;
        this.addCleanup(() => this.disconnectSSE());
    }

    private disconnectSSE(): void {
        if (this._eventSource) {
            this._eventSource.close();
            this._eventSource = null;
        }
    }
}
