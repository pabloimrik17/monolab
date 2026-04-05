import { useNavigate, useParams, useSearchParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import { useViewModel } from "@m0n0lab/solid-clean";
import { container } from "../../../container.ts";
import { TOKENS } from "../../../tokens.ts";
import type { CreateOrderViewModel } from "../../../view-models/create-order.viewmodel.ts";

export default function OrderPage() {
    const params = useParams<{ code: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const vm = useViewModel(() => {
        const instance = container.get<CreateOrderViewModel>(TOKENS.CreateOrderViewModel);
        instance.setSessionCode(params.code);
        if (searchParams.guest) {
            instance.setGuestName(searchParams.guest);
        }
        return instance;
    });

    const handleSubmit = async () => {
        await vm.submitOrder();
        if (vm.submitted()) {
            navigate(`/session/${params.code}/status?guest=${encodeURIComponent(vm.guestName())}`);
        }
    };

    return (
        <main class="min-h-screen bg-stone-50 p-4">
            <div class="max-w-lg mx-auto space-y-6">
                <div class="text-center">
                    <h1 class="text-2xl font-bold text-stone-900">Place Order</h1>
                    <p class="text-stone-500 text-sm">
                        Session {params.code} — {vm.guestName()}
                    </p>
                </div>

                <Show when={vm.error()}>
                    <p class="text-red-600 text-center">{vm.error()}</p>
                </Show>

                <Show when={vm.loading()}>
                    <p class="text-center text-stone-500">Loading menu...</p>
                </Show>

                <div class="space-y-2">
                    <h3 class="font-medium text-stone-700">Menu</h3>
                    <For each={vm.menu()}>
                        {(item) => (
                            <div class="bg-white rounded-lg shadow p-3 flex justify-between items-center">
                                <div>
                                    <p class="font-medium text-stone-800">{item.name}</p>
                                    <p class="text-xs text-stone-500">{item.category}</p>
                                </div>
                                <button
                                    onClick={() => vm.addToCart(item)}
                                    class="px-3 py-1 bg-amber-100 text-amber-800 rounded-md text-sm font-medium hover:bg-amber-200"
                                >
                                    + Add
                                </button>
                            </div>
                        )}
                    </For>
                </div>

                <Show when={vm.cart().length > 0}>
                    <div class="space-y-2">
                        <h3 class="font-medium text-stone-700">Your order</h3>
                        <For each={vm.cart()}>
                            {(item) => (
                                <div class="bg-white rounded-lg shadow p-3 space-y-2">
                                    <div class="flex justify-between items-center">
                                        <span class="font-medium text-stone-800">
                                            {item.menuItemName} x{item.quantity}
                                        </span>
                                        <button
                                            onClick={() => vm.removeFromCart(item.menuItemId)}
                                            class="text-red-500 text-sm hover:text-red-700"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Customization (optional)"
                                        value={item.customization}
                                        onInput={(e) =>
                                            vm.updateCustomization(
                                                item.menuItemId,
                                                e.currentTarget.value,
                                            )
                                        }
                                        class="w-full px-3 py-1.5 border border-stone-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>
                            )}
                        </For>
                    </div>

                    <textarea
                        placeholder="Notes (optional)"
                        value={vm.notes()}
                        onInput={(e) => vm.setNotes(e.currentTarget.value)}
                        class="w-full px-4 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        rows={2}
                    />

                    <button
                        onClick={handleSubmit}
                        disabled={vm.loading() || vm.closed()}
                        class="w-full py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                    >
                        {vm.closed()
                            ? "Session closed"
                            : vm.loading()
                              ? "Submitting..."
                              : "Submit order"}
                    </button>
                </Show>
            </div>
        </main>
    );
}
