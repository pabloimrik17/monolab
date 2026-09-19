import { For, Show } from "solid-js";
import type { PublicOrderSummaryDto } from "@m0n0lab/qup-shared";
import type { JSX } from "solid-js";

// The one card for the reduced public projection. The board's columns, its cancelled strip
// and the guest status screen all render this, so no public screen can grow a field the
// projection does not carry — there is nowhere for notes or customizations to appear.
const TONES = {
    default: { card: "bg-white", name: "text-stone-900" },
    cancelled: { card: "bg-white border border-red-200 min-w-64", name: "text-red-900" },
};

export interface PublicOrderCardProps {
    order: PublicOrderSummaryDto;
    tone?: keyof typeof TONES;
    /** Rendered beside the guest name — the status screen puts its badge here. */
    children?: JSX.Element;
}

export function PublicOrderCard(props: PublicOrderCardProps) {
    const tone = () => TONES[props.tone ?? "default"];

    return (
        <li class={`rounded-xl shadow p-4 space-y-2 ${tone().card}`}>
            <div class="flex items-baseline justify-between gap-3">
                <p class={`text-2xl font-semibold ${tone().name}`}>{props.order.guestName}</p>
                {props.children}
            </div>
            <ul class="space-y-1">
                <For each={props.order.items}>
                    {(line) => (
                        <li class="text-lg text-stone-700">
                            {line.quantity}× {line.name}
                        </li>
                    )}
                </For>
            </ul>
            <Show when={props.order.hiddenItemCount > 0}>
                <p class="text-base text-stone-500">+{props.order.hiddenItemCount} more</p>
            </Show>
        </li>
    );
}
