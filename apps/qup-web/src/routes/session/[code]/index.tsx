import { useNavigate, useParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import { useViewModel } from "@m0n0lab/solid-clean";
import { container } from "../../../container.ts";
import { TOKENS } from "../../../tokens.ts";
import type { JoinSessionViewModel } from "../../../view-models/join-session.viewmodel.ts";

export default function SessionPage() {
    const params = useParams<{ code: string }>();
    const navigate = useNavigate();

    const vm = useViewModel(() => {
        const instance = container.get<JoinSessionViewModel>(TOKENS.JoinSessionViewModel);
        instance.setCode(params.code);
        return instance;
    });

    const handleContinue = () => {
        if (vm.guestName().trim()) {
            navigate(`/session/${params.code}/order?guest=${encodeURIComponent(vm.guestName())}`);
        }
    };

    return (
        <main class="min-h-screen bg-stone-50 p-4">
            <div class="max-w-lg mx-auto space-y-6">
                <div class="text-center">
                    <h1 class="text-2xl font-bold text-stone-900">Qup</h1>
                    <p class="text-stone-500 text-sm uppercase tracking-wider mt-1">
                        Session {params.code}
                    </p>
                </div>

                <Show when={vm.loading()}>
                    <p class="text-center text-stone-500">Loading...</p>
                </Show>

                <Show when={vm.error()}>
                    <p class="text-center text-red-600">{vm.error()}</p>
                </Show>

                <Show when={vm.session()}>
                    <div class="bg-white rounded-lg shadow p-4">
                        <h2 class="font-semibold text-stone-800">{vm.session()!.name}</h2>
                        <p class="text-sm text-stone-500 mt-1">
                            {vm.menu().length} items available
                        </p>
                    </div>

                    <div class="space-y-3">
                        <h3 class="font-medium text-stone-700">Menu</h3>
                        <For each={vm.menu()}>
                            {(item) => (
                                <div class="bg-white rounded-lg shadow p-3 flex justify-between items-center">
                                    <div>
                                        <p class="font-medium text-stone-800">{item.name}</p>
                                        <p class="text-xs text-stone-500">{item.category}</p>
                                        <Show when={item.description}>
                                            <p class="text-sm text-stone-600 mt-1">
                                                {item.description}
                                            </p>
                                        </Show>
                                    </div>
                                </div>
                            )}
                        </For>
                    </div>

                    <div class="space-y-3">
                        <input
                            type="text"
                            placeholder="Your name"
                            value={vm.guestName()}
                            onInput={(e) => vm.setGuestName(e.currentTarget.value)}
                            class="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <button
                            onClick={handleContinue}
                            disabled={!vm.guestName().trim()}
                            class="w-full py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                        >
                            Start ordering
                        </button>
                    </div>
                </Show>
            </div>
        </main>
    );
}
