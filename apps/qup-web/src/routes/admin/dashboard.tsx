import { For, Show } from "solid-js";
import { useViewModel } from "@m0n0lab/solid-clean";
import { container } from "../../container.ts";
import { TOKENS } from "../../tokens.ts";
import type { DashboardViewModel } from "../../view-models/dashboard.viewmodel.ts";

export default function DashboardPage() {
    const vm = useViewModel(() => container.get<DashboardViewModel>(TOKENS.DashboardViewModel));

    const handleCreateSession = (e: SubmitEvent) => {
        e.preventDefault();
        vm.handleCreateSession();
    };

    return (
        <main class="min-h-screen bg-stone-50 p-4">
            <div class="max-w-2xl mx-auto space-y-6">
                <div class="flex justify-between items-center">
                    <h1 class="text-2xl font-bold text-stone-900">Dashboard</h1>
                    <div class="flex gap-2">
                        <a
                            href="/admin/menu"
                            class="px-3 py-1.5 bg-stone-200 text-stone-700 rounded-md text-sm font-medium hover:bg-stone-300"
                        >
                            Menu
                        </a>
                        <a
                            href="/"
                            class="px-3 py-1.5 bg-stone-200 text-stone-700 rounded-md text-sm font-medium hover:bg-stone-300"
                        >
                            Home
                        </a>
                    </div>
                </div>

                <Show when={vm.error()}>
                    <p class="text-red-600">{vm.error()}</p>
                </Show>

                <Show when={vm.loading()}>
                    <p class="text-stone-500">Loading...</p>
                </Show>

                {/* Order summary */}
                <div class="grid grid-cols-4 gap-3">
                    <div class="bg-white rounded-lg shadow p-3 text-center">
                        <p class="text-2xl font-bold text-stone-900">{vm.orderSummary.total}</p>
                        <p class="text-xs text-stone-500">Total</p>
                    </div>
                    <div class="bg-yellow-50 rounded-lg shadow p-3 text-center">
                        <p class="text-2xl font-bold text-yellow-700">{vm.orderSummary.pending}</p>
                        <p class="text-xs text-yellow-600">Pending</p>
                    </div>
                    <div class="bg-blue-50 rounded-lg shadow p-3 text-center">
                        <p class="text-2xl font-bold text-blue-700">{vm.orderSummary.preparing}</p>
                        <p class="text-xs text-blue-600">Preparing</p>
                    </div>
                    <div class="bg-green-50 rounded-lg shadow p-3 text-center">
                        <p class="text-2xl font-bold text-green-700">{vm.orderSummary.done}</p>
                        <p class="text-xs text-green-600">Done</p>
                    </div>
                </div>

                {/* Create session */}
                <form
                    onSubmit={handleCreateSession}
                    class="flex gap-2"
                >
                    <input
                        type="text"
                        placeholder="New session name"
                        value={vm.newSessionName()}
                        onInput={(e) => vm.setNewSessionName(e.currentTarget.value)}
                        class="flex-1 px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                        type="submit"
                        disabled={!vm.newSessionName().trim()}
                        class="px-4 py-2 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50"
                    >
                        Create
                    </button>
                </form>

                {/* Active sessions */}
                <div class="space-y-3">
                    <h2 class="font-medium text-stone-700">Active Sessions</h2>
                    <Show when={vm.sessions().length === 0 && !vm.loading()}>
                        <p class="text-stone-400">No active sessions</p>
                    </Show>
                    <For each={vm.sessions()}>
                        {(session) => (
                            <div class="bg-white rounded-lg shadow p-4 flex justify-between items-center">
                                <div>
                                    <p class="font-medium text-stone-800">{session.name}</p>
                                    <p class="text-xs text-stone-500 font-mono">
                                        Code: {session.code}
                                    </p>
                                </div>
                                <div class="flex gap-2">
                                    <a
                                        href={`/admin/session/${session.id}`}
                                        class="px-3 py-1 bg-amber-100 text-amber-800 rounded-md text-sm font-medium hover:bg-amber-200"
                                    >
                                        Orders
                                    </a>
                                    <button
                                        onClick={() => vm.handleCloseSession(session.id)}
                                        class="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}
                    </For>
                </div>
            </div>
        </main>
    );
}
