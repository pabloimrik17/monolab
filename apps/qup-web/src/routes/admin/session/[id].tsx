import { useParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import { useViewModel } from "@m0n0lab/solid-clean";
import { container } from "../../../container.ts";
import { TOKENS } from "../../../tokens.ts";
import type { OrderQueueViewModel } from "../../../view-models/order-queue.viewmodel.ts";

const STATUS_COLORS: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PREPARING: "bg-blue-100 text-blue-800",
    DONE: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
};

export default function OrderQueuePage() {
    const params = useParams<{ id: string }>();

    const vm = useViewModel(() => {
        const instance = container.get<OrderQueueViewModel>(TOKENS.OrderQueueViewModel);
        instance.setSessionId(params.id);
        return instance;
    });

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
                        class="px-3 py-1.5 bg-stone-200 text-stone-700 rounded-md text-sm font-medium hover:bg-stone-300"
                    >
                        Back
                    </a>
                </div>

                <Show when={vm.error()}>
                    <p class="text-red-600">{vm.error()}</p>
                </Show>

                <Show when={vm.loading()}>
                    <p class="text-stone-500">Loading...</p>
                </Show>

                <For each={vm.orders()}>
                    {(order) => (
                        <div class="bg-white rounded-lg shadow p-4 space-y-3">
                            <div class="flex justify-between items-center">
                                <span class="font-medium text-stone-800">{order.guestName}</span>
                                <span
                                    class={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[order.status] ?? ""}`}
                                >
                                    {order.status}
                                </span>
                            </div>

                            <For each={order.items}>
                                {(item) => (
                                    <div class="text-sm text-stone-600">
                                        {item.menuItemName} x{item.quantity}
                                        <Show when={item.customization}>
                                            <span class="text-stone-400">
                                                {" "}
                                                — {item.customization}
                                            </span>
                                        </Show>
                                    </div>
                                )}
                            </For>

                            <Show when={order.notes}>
                                <p class="text-xs text-stone-400 italic">{order.notes}</p>
                            </Show>

                            <Show when={order.status === "PENDING" || order.status === "PREPARING"}>
                                <div class="flex gap-2 pt-1">
                                    <Show when={order.status === "PENDING"}>
                                        <button
                                            onClick={() =>
                                                vm.handleUpdateStatus(order.id, "PREPARING")
                                            }
                                            class="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-200"
                                        >
                                            Start preparing
                                        </button>
                                    </Show>
                                    <Show when={order.status === "PREPARING"}>
                                        <button
                                            onClick={() => vm.handleUpdateStatus(order.id, "DONE")}
                                            class="px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm font-medium hover:bg-green-200"
                                        >
                                            Mark done
                                        </button>
                                    </Show>
                                    <button
                                        onClick={() => vm.handleCancelOrder(order.id)}
                                        class="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </Show>
                        </div>
                    )}
                </For>
            </div>
        </main>
    );
}
