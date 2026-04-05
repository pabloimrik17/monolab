import { injectable } from "inversify";
import { createSignal } from "solid-js";
import { BaseViewModel } from "@m0n0lab/solid-clean";
import { getSessionByCode, getSessionOrders } from "../server/data.ts";
import type { OrderDto } from "@m0n0lab/qup-shared";

const SSE_BASE_URL =
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    (import.meta.env?.VITE_API_URL as string | undefined) ?? "http://localhost:3001";

@injectable()
export class OrderStatusViewModel extends BaseViewModel {
    private readonly _loading = createSignal(false);
    private readonly _error = createSignal("");
    private readonly _orders = createSignal<OrderDto[]>([]);
    private _sessionCode = "";
    private _guestName = "";
    private _sessionId = "";
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
        this._loading[1](true);
        try {
            const session = await getSessionByCode(this._sessionCode);
            this._sessionId = session.id;
            const orders = await getSessionOrders(session.id);
            this._orders[1](this.filterOrders(orders));
            this.connectSSE();
        } catch (e) {
            this._error[1](e instanceof Error ? e.message : "Failed to load orders");
        } finally {
            this._loading[1](false);
        }
    }

    override willUnmount(): void {
        this.disconnectSSE();
        super.willUnmount();
    }

    private filterOrders(orders: OrderDto[]): OrderDto[] {
        if (!this._guestName) return orders;
        return orders.filter((o) => o.guestName === this._guestName);
    }

    private connectSSE(): void {
        const url = `${SSE_BASE_URL}/events/sessions/${this._sessionCode}`;
        const es = new EventSource(url);

        es.onmessage = async () => {
            try {
                const orders = await getSessionOrders(this._sessionId);
                this._orders[1](this.filterOrders(orders));
            } catch {
                // silent — keep showing last known orders
            }
        };

        es.onerror = () => {
            // EventSource auto-reconnects; no action needed
        };

        this._eventSource = es;
    }

    private disconnectSSE(): void {
        if (this._eventSource) {
            this._eventSource.close();
            this._eventSource = null;
        }
    }
}
