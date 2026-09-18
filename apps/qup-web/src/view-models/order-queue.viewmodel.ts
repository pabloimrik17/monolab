import { injectable } from "inversify";
import { createSignal } from "solid-js";
import { BaseViewModel } from "@m0n0lab/solid-clean";
import { getSession, getSessionOrders } from "../server/data.ts";
import { cancelOrder, updateOrderStatus } from "../server/mutations.ts";
import { sessionEventsUrl } from "../services/sse-url.ts";
import type {
    OrderCancelledEvent,
    OrderCreatedEvent,
    OrderDto,
    OrderStatusEvent,
    SessionDto,
} from "@m0n0lab/qup-shared";

@injectable()
export class OrderQueueViewModel extends BaseViewModel {
    private readonly _loading = createSignal(false);
    private readonly _error = createSignal("");
    private readonly _session = createSignal<SessionDto | undefined>(undefined);
    private readonly _orders = createSignal<OrderDto[]>([]);
    private _sessionId = "";
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
        try {
            const [session, orders] = await Promise.all([
                getSession(this._sessionId),
                getSessionOrders(this._sessionId),
            ]);
            this._session[1](session);
            this._orders[1](orders);
            this.connectSSE(session.code);
        } catch (e) {
            this._error[1](e instanceof Error ? e.message : "Failed to load session");
        } finally {
            this._loading[1](false);
        }
    }

    override willUnmount(): void {
        this.disconnectSSE();
        super.willUnmount();
    }

    async handleUpdateStatus(orderId: string, status: OrderDto["status"]): Promise<void> {
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

    private patchOrder(orderId: string, changes: Partial<OrderDto>): void {
        this._orders[1]((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...changes } : o)));
    }

    private connectSSE(sessionCode: string): void {
        this._eventSource = new EventSource(sessionEventsUrl(sessionCode));

        // The API sends named SSE events, which never reach `onmessage`.
        const on = <T>(event: string, handler: (payload: T) => void) => {
            this._eventSource?.addEventListener(event, (e: MessageEvent<string>) => {
                try {
                    handler(JSON.parse(e.data) as T);
                } catch {
                    // ignore malformed events
                }
            });
        };

        on<OrderCreatedEvent>("order:created", ({ order }) => {
            this._orders[1]((prev) =>
                prev.some((o) => o.id === order.id) ? prev : [...prev, order],
            );
        });
        on<OrderStatusEvent>("order:status", ({ orderId, status, updatedAt }) => {
            this.patchOrder(orderId, { status, updatedAt });
        });
        on<OrderCancelledEvent>("order:cancelled", ({ orderId }) => {
            this.patchOrder(orderId, { status: "CANCELLED" });
        });

        this._eventSource.onerror = () => {
            this._error[1]("Lost connection to live updates");
        };

        this.addCleanup(() => this.disconnectSSE());
    }

    private disconnectSSE(): void {
        if (this._eventSource) {
            this._eventSource.close();
            this._eventSource = null;
        }
    }
}
