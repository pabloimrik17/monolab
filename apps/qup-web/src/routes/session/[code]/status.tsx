import { useParams, useSearchParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import { useViewModel } from "@m0n0lab/solid-clean";
import { container } from "../../../container.ts";
import { TOKENS } from "../../../tokens.ts";
import type { OrderStatusViewModel } from "../../../view-models/order-status.viewmodel.ts";

const STATUS_COLORS: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PREPARING: "bg-blue-100 text-blue-800",
    DONE: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
};

export default function StatusPage() {
    const params = useParams<{ code: string }>();
    const [searchParams] = useSearchParams();

    const vm = useViewModel(() => {
        const instance = container.get<OrderStatusViewModel>(TOKENS.OrderStatusViewModel);
        instance.setSessionCode(params.code);
        if (searchParams.guest) {
            instance.setGuestName(searchParams.guest);
        }
        return instance;
    });

    return (
        <main class="min-h-screen bg-stone-50 p-4">
            <div class="max-w-lg mx-auto space-y-6">
                <div class="text-center">
                    <h1 class="text-2xl font-bold text-stone-900">Order Status</h1>
                    <p class="text-stone-500 text-sm">
                        Session {params.code}
                        {searchParams.guest ? ` — ${searchParams.guest}` : ""}
                    </p>
                </div>

                <Show when={vm.loading()}>
                    <p class="text-center text-stone-500">Loading...</p>
                </Show>

                <Show when={vm.error()}>
                    <p class="text-center text-red-600">{vm.error()}</p>
                </Show>

                <Show when={vm.orders().length === 0 && !vm.loading()}>
                    <p class="text-center text-stone-500">No orders yet</p>
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
                        </div>
                    )}
                </For>

                <a
                    href={`/session/${params.code}/order?guest=${encodeURIComponent(searchParams.guest ?? "")}`}
                    class="block text-center py-3 bg-stone-200 text-stone-700 font-medium rounded-lg hover:bg-stone-300 transition-colors"
                >
                    Place another order
                </a>
            </div>
        </main>
    );
}
