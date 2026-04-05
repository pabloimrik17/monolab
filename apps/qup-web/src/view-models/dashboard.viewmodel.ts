import { injectable } from "inversify";
import { createSignal } from "solid-js";
import { BaseViewModel } from "@m0n0lab/solid-clean";
import { getActiveSessions, getSessionOrders } from "../server/data.ts";
import { closeSession, createSession } from "../server/mutations.ts";
import type { OrderDto, SessionDto } from "@m0n0lab/qup-shared";

interface OrderSummary {
    total: number;
    pending: number;
    preparing: number;
    done: number;
}

@injectable()
export class DashboardViewModel extends BaseViewModel {
    private readonly _loading = createSignal(false);
    private readonly _error = createSignal("");
    private readonly _sessions = createSignal<SessionDto[]>([]);
    private readonly _newSessionName = createSignal("");
    private readonly _orderSummary = createSignal<OrderSummary>({
        total: 0,
        pending: 0,
        preparing: 0,
        done: 0,
    });

    get loading() {
        return this._loading[0];
    }
    get error() {
        return this._error[0];
    }
    get sessions() {
        return this._sessions[0];
    }
    get newSessionName() {
        return this._newSessionName[0];
    }
    get orderSummary(): OrderSummary {
        return this._orderSummary[0]();
    }

    setNewSessionName(name: string): void {
        this._newSessionName[1](name);
    }

    override async didMount(): Promise<void> {
        await this.loadData();
    }

    async handleCreateSession(): Promise<void> {
        const name = this._newSessionName[0]().trim();
        if (!name) return;
        this._error[1]("");
        try {
            const session = await createSession({ name });
            this._sessions[1]((prev) => [...prev, session]);
            this._newSessionName[1]("");
        } catch (e) {
            this._error[1](e instanceof Error ? e.message : "Failed to create session");
        }
    }

    async handleCloseSession(sessionId: string): Promise<void> {
        this._error[1]("");
        try {
            await closeSession(sessionId);
            this._sessions[1]((prev) => prev.filter((s) => s.id !== sessionId));
            await this.computeOrderSummary(this._sessions[0]());
        } catch (e) {
            this._error[1](e instanceof Error ? e.message : "Failed to close session");
        }
    }

    private async loadData(): Promise<void> {
        this._loading[1](true);
        try {
            const sessions = await getActiveSessions();
            this._sessions[1](sessions);
            await this.computeOrderSummary(sessions);
        } catch (e) {
            this._error[1](e instanceof Error ? e.message : "Failed to load dashboard");
        } finally {
            this._loading[1](false);
        }
    }

    private async computeOrderSummary(sessions: SessionDto[]): Promise<void> {
        const allOrders = await Promise.all(sessions.map((s) => getSessionOrders(s.id)));
        const orders: OrderDto[] = allOrders.flat();
        this._orderSummary[1]({
            total: orders.length,
            pending: orders.filter((o) => o.status === "PENDING").length,
            preparing: orders.filter((o) => o.status === "PREPARING").length,
            done: orders.filter((o) => o.status === "DONE").length,
        });
    }
}
