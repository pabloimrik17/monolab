import { For, Show } from "solid-js";
import type { PublicOrderSummaryDto } from "@m0n0lab/qup-shared";
import type { JSX } from "solid-js";

// The one card for the reduced public projection. The board's columns, its cancelled strip
// and the guest status screen all render this, so no public screen can grow a field the
// projection does not carry — there is nowhere for notes or customizations to appear.
//
// `tone` and `scale` never style the same thing, so any pair combines (a cancelled card on
// the board): tone owns the card's colours and borders, scale owns the type.
const TONES = {
    default: { card: "bg-white", name: "text-stone-900" },
    cancelled: { card: "bg-white border border-red-200 min-w-64", name: "text-red-900" },
};

// The board is read from across a room, so its scale also darkens the secondary text and
// adds the column transition (`board-card`, global.css). Neither varies with tone.
const SCALES = {
    screen: {
        card: "",
        name: "text-2xl font-semibold",
        item: "text-lg text-stone-700",
        more: "text-base text-stone-500",
    },
    board: {
        card: "board-card",
        name: "text-3xl font-bold",
        item: "text-xl text-stone-800",
        more: "text-lg text-stone-600",
    },
};

export interface PublicOrderCardProps {
    order: PublicOrderSummaryDto;
    tone?: keyof typeof TONES;
    scale?: keyof typeof SCALES;
    /** Plays the new-order highlight (`board-card-new`, global.css). */
    highlighted?: boolean;
    /** Rendered beside the guest name — the status screen puts its badge here. */
    children?: JSX.Element;
}

export function PublicOrderCard(props: PublicOrderCardProps) {
    const tone = () => TONES[props.tone ?? "default"];
    const scale = () => SCALES[props.scale ?? "screen"];
    const cardClass = () =>
        [
            "rounded-xl shadow p-4 space-y-2",
            tone().card,
            scale().card,
            props.highlighted === true && "board-card-new",
        ]
            .filter(Boolean)
            .join(" ");

    return (
        <li class={cardClass()}>
            <div class="flex items-baseline justify-between gap-3">
                <p class={`${scale().name} ${tone().name}`}>{props.order.guestName}</p>
                {props.children}
            </div>
            <ul class="space-y-1">
                <For each={props.order.items}>
                    {(line) => (
                        <li class={scale().item}>
                            {line.quantity}× {line.name}
                        </li>
                    )}
                </For>
            </ul>
            <Show when={props.order.hiddenItemCount > 0}>
                <p class={scale().more}>+{props.order.hiddenItemCount} more</p>
            </Show>
        </li>
    );
}
