import { For, Show } from "solid-js";
import { OrderStatusBadge } from "./order-status-badge.tsx";
import type { OrderDto } from "@m0n0lab/qup-shared";
import type { JSX } from "solid-js";

interface OrderCardProps {
    order: OrderDto;
    children?: JSX.Element;
}

export function OrderCard(props: OrderCardProps) {
    return (
        <div class="bg-white rounded-lg shadow p-4 space-y-3">
            <div class="flex justify-between items-center">
                <span class="font-medium text-stone-800">{props.order.guestName}</span>
                <OrderStatusBadge status={props.order.status} />
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
