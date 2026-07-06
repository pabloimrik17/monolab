import { For, Show } from "solid-js";
import type { OrderDto } from "@m0n0lab/qup-shared";
import type { JSX } from "solid-js";

const STATUS_COLORS: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PREPARING: "bg-blue-100 text-blue-800",
    DONE: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
};

interface OrderCardProps {
    order: OrderDto;
    children?: JSX.Element;
}

export function OrderCard(props: OrderCardProps) {
    return (
        <div class="bg-white rounded-lg shadow p-4 space-y-3">
            <div class="flex justify-between items-center">
                <span class="font-medium text-stone-800">{props.order.guestName}</span>
                <span
                    class={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[props.order.status] ?? ""}`}
                >
                    {props.order.status}
                </span>
            </div>

            <For each={props.order.items}>
                {(item) => (
                    <div class="text-sm text-stone-600">
                        {item.menuItemName} x{item.quantity}
                        <Show when={item.customization}>
                            <span class="text-stone-400"> — {item.customization}</span>
                        </Show>
                    </div>
                )}
            </For>

            <Show when={props.order.notes}>
                <p class="text-xs text-stone-400 italic">{props.order.notes}</p>
            </Show>

            {props.children}
        </div>
    );
}
