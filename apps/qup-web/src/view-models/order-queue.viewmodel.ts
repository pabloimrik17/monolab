import { injectable } from "inversify";
import { createSignal } from "solid-js";
import { BaseViewModel } from "@m0n0lab/solid-clean";
import { getSession, getSessionOrders } from "../server/data.ts";
import { cancelOrder, updateOrderStatus } from "../server/mutations.ts";
import type { OrderDto, SessionDto } from "@m0n0lab/qup-shared";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

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
            const updated = await updateOrderStatus(orderId, { status });
            this._orders[1]((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
        } catch (e) {
            this._error[1](e instanceof Error ? e.message : "Failed to update order status");
        }
    }

    async handleCancelOrder(orderId: string): Promise<void> {
        this._error[1]("");
        try {
            await cancelOrder(orderId);
            this._orders[1]((prev) =>
                prev.map((o) => (o.id === orderId ? { ...o, status: "CANCELLED" as const } : o)),
            );
        } catch (e) {
            this._error[1](e instanceof Error ? e.message : "Failed to cancel order");
        }
    }

    private connectSSE(sessionCode: string): void {
        this._eventSource = new EventSource(`${API_URL}/events/sessions/${sessionCode}`);

        this._eventSource.onmessage = (event) => {
            try {
                const order = JSON.parse(event.data as string) as OrderDto;
                this._orders[1]((prev) => {
                    const idx = prev.findIndex((o) => o.id === order.id);
                    if (idx >= 0) {
                        return prev.map((o) => (o.id === order.id ? order : o));
                    }
                    return [...prev, order];
                });
            } catch {
                // ignore malformed events
            }
        };

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
