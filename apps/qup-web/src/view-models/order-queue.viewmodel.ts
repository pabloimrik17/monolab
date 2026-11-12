import { injectable } from "inversify";
import { createSignal } from "solid-js";
import { BaseViewModel } from "@m0n0lab/solid-clean";
import { getSession, getSessionOrders } from "../server/host-data.ts";
import { cancelOrder, updateOrderStatus } from "../server/mutations.ts";
import { createCoalescingRefetch } from "../services/coalescing-refetch.ts";
import { sessionEventsUrl } from "../services/sse-url.ts";
import type { CoalescingRefetch } from "../services/coalescing-refetch.ts";
import type { OrderDto, SessionDto, UpdateOrderStatusRequest } from "@m0n0lab/qup-shared";

// The stream is public and carries no order data, so every name on it means the same thing
// to the queue: refetch the protected snapshot, which is the only place the notes and
// customizations this screen shows still exist.
const ORDER_EVENTS = ["order:created", "order:status", "order:cancelled"] as const;

@injectable()
export class OrderQueueViewModel extends BaseViewModel {
    private readonly _loading = createSignal(false);
    private readonly _error = createSignal("");
    private readonly _session = createSignal<SessionDto | undefined>(undefined);
    private readonly _orders = createSignal<OrderDto[]>([]);
    private _sessionId = "";
    private _refetch: CoalescingRefetch | null = null;
    private _eventSource: EventSource | null = null;

    get loading() {
        return this._loading[0];
    }
    get error() {
        return this._error[0];
    }
    get session() {
        return this._session[0];
    }
    get orders() {
        return this._orders[0];
    }

    setSessionId(id: string): void {
        this._sessionId = id;
    }

    override async didMount(): Promise<void> {
        this._loading[1](true);
        this._refetch = createCoalescingRefetch({
            fetch: () => getSessionOrders(this._sessionId),
            apply: (orders) => this._orders[1](orders),
            onError: (e) =>
                this._error[1](e instanceof Error ? e.message : "Failed to load orders"),
        });
        this.addCleanup(() => this._refetch?.stop());

        try {
            // The first load goes through the helper too, so there is only ever one path
            // from this screen to the snapshot.
            const [session] = await Promise.all([
                getSession(this._sessionId),
                this._refetch.trigger(),
            ]);
            this._session[1](session);
            this.connectSSE(session.code);
        } catch (e) {
            this._error[1](e instanceof Error ? e.message : "Failed to load session");
        } finally {
            this._loading[1](false);
        }
    }

    async handleUpdateStatus(
        orderId: string,
        status: UpdateOrderStatusRequest["status"],
    ): Promise<void> {
        this._error[1]("");
        try {
            await updateOrderStatus(orderId, { status });
            this.patchOrder(orderId, { status });
        } catch (e) {
            this._error[1](e instanceof Error ? e.message : "Failed to update order status");
        }
    }

    async handleCancelOrder(orderId: string): Promise<void> {
        this._error[1]("");
        try {
            await cancelOrder(orderId);
            this.patchOrder(orderId, { status: "CANCELLED" });
        } catch (e) {
            this._error[1](e instanceof Error ? e.message : "Failed to cancel order");
        }
    }

    // The host's own mutations still land optimistically: the refetch only has to cover
    // other people's changes, so the buttons stay as responsive as they were.
    private patchOrder(orderId: string, changes: Partial<OrderDto>): void {
        this._orders[1]((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...changes } : o)));
    }

    private connectSSE(sessionCode: string): void {
        const es = new EventSource(sessionEventsUrl(sessionCode));

        // The API sends named SSE events, which never reach `onmessage`.
        for (const event of ORDER_EVENTS) {
            es.addEventListener(event, () => void this._refetch?.trigger());
        }

        es.onerror = () => {
            this._error[1]("Lost connection to live updates");
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
