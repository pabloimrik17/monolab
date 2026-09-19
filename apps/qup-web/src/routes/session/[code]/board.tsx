import { useParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import { useViewModel } from "@m0n0lab/solid-clean";
import { container } from "../../../container.ts";
import { TOKENS } from "../../../tokens.ts";
import type { OrderBoardViewModel } from "../../../view-models/order-board.viewmodel.ts";
import type { PublicOrderItemLineDto, PublicOrderSummaryDto } from "@m0n0lab/qup-shared";

function ItemLine(props: { line: PublicOrderItemLineDto }) {
    return (
        <li class="text-lg text-stone-700">
            {props.line.quantity}× {props.line.name}
        </li>
    );
}

function BoardCard(props: { order: PublicOrderSummaryDto }) {
    return (
        <li class="bg-white rounded-xl shadow p-4 space-y-2">
            <p class="text-2xl font-semibold text-stone-900">{props.order.guestName}</p>
            <ul class="space-y-1">
                <For each={props.order.items}>{(line) => <ItemLine line={line} />}</For>
            </ul>
            <Show when={props.order.hiddenItemCount > 0}>
                <p class="text-base text-stone-500">+{props.order.hiddenItemCount} more</p>
            </Show>
        </li>
    );
}

function BoardSection(props: { title: string; orders: PublicOrderSummaryDto[] }) {
    return (
        <section class="space-y-3">
            <h2 class="text-xl font-bold uppercase tracking-wide text-stone-600">{props.title}</h2>
            <ul class="space-y-3">
                <For each={props.orders}>{(order) => <BoardCard order={order} />}</For>
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
                <header class="flex items-baseline justify-between gap-4 flex-wrap">
                    <h1 class="text-3xl lg:text-4xl font-bold text-stone-900">
                        {vm.sessionName() || "Order board"}
                    </h1>
                    <Show when={vm.state() === "ready"}>
                        <p class="text-2xl uppercase tracking-widest text-stone-500">
                            {vm.sessionCode()}
                        </p>
                    </Show>
                </header>

                <Show when={vm.state() === "loading"}>
                    <p class="text-center text-xl text-stone-500">Loading...</p>
                </Show>

                <Show when={vm.state() === "not-found"}>
                    <p class="text-center text-2xl text-stone-700">Session not found</p>
                </Show>

                <Show when={vm.state() === "ended"}>
                    <p class="text-center text-2xl text-stone-700">Session ended</p>
                </Show>

                <Show when={vm.state() === "error"}>
                    <p class="text-center text-xl text-red-600">{vm.error()}</p>
                </Show>

                <Show when={vm.state() === "ready"}>
                    <Show when={!vm.hasVisibleOrders()}>
                        <p class="text-center text-2xl text-stone-500">No orders yet</p>
                    </Show>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <BoardSection
                            title="Pending"
                            orders={vm.pending()}
                        />
                        <BoardSection
                            title="Preparing"
                            orders={vm.preparing()}
                        />
                        <BoardSection
                            title="Recently served"
                            orders={vm.recentlyServed()}
                        />
                    </div>
                </Show>
            </div>
        </main>
    );
}
