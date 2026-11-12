import { useParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import { useViewModel } from "@m0n0lab/solid-clean";
import { PublicOrderCard } from "../../../components/public-order-card.tsx";
import { SessionQr } from "../../../components/session-qr.tsx";
import { container } from "../../../container.ts";
import { TOKENS } from "../../../tokens.ts";
import type { OrderBoardViewModel } from "../../../view-models/order-board.viewmodel.ts";
import type { PublicOrderSummaryDto } from "@m0n0lab/qup-shared";

// Cancelled orders live here and nowhere else: a red strip under the three sections,
// laid out as a row so it reads as a footnote to the board rather than a fourth column.
function CancelledStrip(props: {
    orders: PublicOrderSummaryDto[];
    isHighlighted: (id: string) => boolean;
}) {
    return (
        <section class="rounded-xl border-2 border-red-300 bg-red-50 p-4 space-y-3">
            <h2 class="text-2xl font-bold uppercase tracking-wide text-red-700">Cancelled</h2>
            <ul class="flex flex-wrap gap-3">
                <For each={props.orders}>
                    {(order) => (
                        <PublicOrderCard
                            order={order}
                            tone="cancelled"
                            scale="board"
                            highlighted={props.isHighlighted(order.id)}
                        />
                    )}
                </For>
            </ul>
        </section>
    );
}

function BoardSection(props: {
    title: string;
    orders: PublicOrderSummaryDto[];
    isHighlighted: (id: string) => boolean;
}) {
    return (
        <section class="space-y-3">
            <h2 class="text-2xl font-bold uppercase tracking-wide text-stone-700">{props.title}</h2>
            <ul class="space-y-3">
                <For each={props.orders}>
                    {(order) => (
                        <PublicOrderCard
                            order={order}
                            scale="board"
                            highlighted={props.isHighlighted(order.id)}
                        />
                    )}
                </For>
            </ul>
        </section>
    );
}

export default function BoardPage() {
    const params = useParams<{ code: string }>();

    const vm = useViewModel(() => {
        const instance = container.get<OrderBoardViewModel>(TOKENS.OrderBoardViewModel);
        instance.setSessionCode(params.code);
        return instance;
    });

    return (
        <main class="min-h-screen bg-stone-50 p-6">
            <div class="max-w-7xl mx-auto space-y-8">
                <header class="flex items-start justify-between gap-4 flex-wrap">
                    <div class="space-y-1">
                        <h1 class="text-4xl lg:text-5xl font-bold text-stone-900">
                            {vm.sessionName() || "Order board"}
                        </h1>
                        <Show when={vm.state() === "ready"}>
                            <p class="text-3xl uppercase tracking-widest text-stone-600">
                                {vm.sessionCode()}
                            </p>
                        </Show>
                    </div>

                    <Show when={vm.state() === "ready"}>
                        <div class="flex items-center gap-4">
                            <SessionQr code={vm.sessionCode()} />
                            <Show when={!vm.isFullscreen()}>
                                <button
                                    type="button"
                                    onClick={() => vm.enterFullscreen()}
                                    class="text-sm text-stone-400 hover:text-stone-600 border border-stone-300 rounded-lg px-3 py-2 transition-colors"
                                >
                                    Enter fullscreen
                                </button>
                            </Show>
                        </div>
                    </Show>
                </header>

                <Show when={vm.state() === "loading"}>
                    <p class="text-center text-2xl text-stone-600">Loading...</p>
                </Show>

                <Show when={vm.state() === "not-found"}>
                    <p class="text-center text-3xl text-stone-800">Session not found</p>
                </Show>

                {/* Shown both for a session that was already closed on load and for one
                    that closed while the board was open — in the second case the cards
                    stay exactly as they were. */}
                <Show when={vm.state() === "ended" || vm.sessionEnded()}>
                    <p class="text-center text-3xl text-stone-800">Session ended</p>
                </Show>

                <Show when={vm.reconnecting()}>
                    <p class="text-center text-2xl text-amber-800">Reconnecting…</p>
                </Show>

                <Show when={vm.state() === "error"}>
                    <p class="text-center text-2xl text-red-700">{vm.error()}</p>
                </Show>

                <Show when={vm.state() === "ready"}>
                    <Show when={!vm.hasVisibleOrders()}>
                        <p class="text-center text-3xl text-stone-700">No orders yet</p>
                    </Show>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <BoardSection
                            title="Pending"
                            orders={vm.pending()}
                            isHighlighted={vm.isHighlighted}
                        />
                        <BoardSection
                            title="Preparing"
                            orders={vm.preparing()}
                            isHighlighted={vm.isHighlighted}
                        />
                        <BoardSection
                            title="Recently served"
                            orders={vm.recentlyServed()}
                            isHighlighted={vm.isHighlighted}
                        />
                    </div>

                    <Show when={vm.cancelled().length > 0}>
                        <CancelledStrip
                            orders={vm.cancelled()}
                            isHighlighted={vm.isHighlighted}
                        />
                    </Show>
                </Show>
            </div>
        </main>
    );
}
