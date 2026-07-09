import { useParams, useSearchParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import { useViewModel } from "@m0n0lab/solid-clean";
import { OrderCard } from "../../../components/order-card.tsx";
import { VmStatus } from "../../../components/vm-status.tsx";
import { container } from "../../../container.ts";
import { TOKENS } from "../../../tokens.ts";
import type { OrderStatusViewModel } from "../../../view-models/order-status.viewmodel.ts";

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

                <VmStatus
                    centered
                    loading={vm.loading}
                    error={vm.error}
                />

                <Show when={vm.orders().length === 0 && !vm.loading() && !vm.error()}>
                    <p class="text-center text-stone-500">No orders yet</p>
                </Show>

                <For each={vm.orders()}>{(order) => <OrderCard order={order} />}</For>

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
