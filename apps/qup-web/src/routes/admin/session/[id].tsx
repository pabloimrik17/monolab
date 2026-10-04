import { useParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import { useViewModel } from "@m0n0lab/solid-clean";
import { OrderCard } from "../../../components/order-card.tsx";
import { VmStatus } from "../../../components/vm-status.tsx";
import { container } from "../../../container.ts";
import { TOKENS } from "../../../tokens.ts";
import type { OrderQueueViewModel } from "../../../view-models/order-queue.viewmodel.ts";
import type { OrderDto } from "@m0n0lab/qup-shared";

// Open orders first, then finished ones; stable within each group (oldest first).
const STATUS_RANK: Record<OrderDto["status"], number> = {
    PREPARING: 0,
    PENDING: 1,
    DONE: 2,
    CANCELLED: 3,
};

export default function OrderQueuePage() {
    const params = useParams<{ id: string }>();

    const vm = useViewModel(() => {
        const instance = container.get<OrderQueueViewModel>(TOKENS.OrderQueueViewModel);
        instance.setSessionId(params.id);
        return instance;
    });

    const sortedOrders = () =>
        [...vm.orders()].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);

    return (
        <main class="min-h-screen bg-stone-50 p-4">
            <div class="max-w-2xl mx-auto space-y-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-2xl font-bold text-stone-900">Order Queue</h1>
                        <Show when={vm.session()}>
                            <p class="text-stone-500 text-sm">
                                {vm.session()!.name} — {vm.session()!.code}
                            </p>
                        </Show>
                    </div>
                    <a
                        href="/admin/dashboard"
                        class="px-3 py-2 bg-stone-200 text-stone-700 rounded-md text-sm font-medium hover:bg-stone-300"
                    >
                        Back
                    </a>
                </div>

                <VmStatus
                    loading={vm.loading}
                    error={vm.error}
                />

                <For each={sortedOrders()}>
                    {(order) => (
                        <OrderCard order={order}>
                            <Show when={order.status === "PENDING" || order.status === "PREPARING"}>
                                <div class="flex gap-2 pt-1">
                                    <Show when={order.status === "PENDING"}>
                                        <button
                                            onClick={() =>
                                                vm.handleUpdateStatus(order.id, "PREPARING")
                                            }
                                            class="flex-1 sm:flex-none px-4 py-2 bg-blue-100 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-200"
                                        >
                                            Start preparing
                                        </button>
                                    </Show>
                                    <Show when={order.status === "PREPARING"}>
                                        <button
                                            onClick={() => vm.handleUpdateStatus(order.id, "DONE")}
                                            class="flex-1 sm:flex-none px-4 py-2 bg-green-100 text-green-700 rounded-md text-sm font-medium hover:bg-green-200"
                                        >
                                            Mark done
                                        </button>
                                    </Show>
                                    {/* The domain only allows cancelling orders not yet started */}
                                    <Show when={order.status === "PENDING"}>
                                        <button
                                            onClick={() => vm.handleCancelOrder(order.id)}
                                            class="px-4 py-2 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200"
                                        >
                                            Cancel
                                        </button>
                                    </Show>
                                </div>
                            </Show>
                        </OrderCard>
                    )}
                </For>
            </div>
        </main>
    );
}
