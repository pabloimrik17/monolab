import { For, Show } from "solid-js";
import { useViewModel } from "@m0n0lab/solid-clean";
import { container } from "../../container.ts";
import { TOKENS } from "../../tokens.ts";
import type { MenuManagementViewModel } from "../../view-models/menu-management.viewmodel.ts";

const CATEGORIES = ["COFFEE", "TEA", "INFUSION", "JUICE", "OTHER"] as const;

export default function MenuPage() {
    const vm = useViewModel(() =>
        container.get<MenuManagementViewModel>(TOKENS.MenuManagementViewModel),
    );

    const handleSave = (e: SubmitEvent) => {
        e.preventDefault();
        vm.handleSave();
    };

    return (
        <main class="min-h-screen bg-stone-50 p-4">
            <div class="max-w-2xl mx-auto space-y-6">
                <div class="flex justify-between items-center">
                    <h1 class="text-2xl font-bold text-stone-900">Menu Management</h1>
                    <a
                        href="/admin/dashboard"
                        class="px-3 py-1.5 bg-stone-200 text-stone-700 rounded-md text-sm font-medium hover:bg-stone-300"
                    >
                        Back
                    </a>
                </div>

                <Show when={vm.error()}>
                    <p class="text-red-600">{vm.error()}</p>
                </Show>

                {/* Add / Edit form */}
                <form
                    onSubmit={handleSave}
                    class="bg-white rounded-lg shadow p-4 space-y-3"
                >
                    <h2 class="font-medium text-stone-700">
                        {vm.editingId() ? "Edit item" : "Add item"}
                    </h2>
                    <input
                        type="text"
                        placeholder="Item name"
                        value={vm.formName()}
                        onInput={(e) => vm.setFormName(e.currentTarget.value)}
                        class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <select
                        value={vm.formCategory()}
                        onChange={(e) =>
                            vm.setFormCategory(e.currentTarget.value as (typeof CATEGORIES)[number])
                        }
                        class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                        <For each={CATEGORIES}>{(cat) => <option value={cat}>{cat}</option>}</For>
                    </select>
                    <input
                        type="text"
                        placeholder="Description (optional)"
                        value={vm.formDescription()}
                        onInput={(e) => vm.setFormDescription(e.currentTarget.value)}
                        class="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <div class="flex gap-2">
                        <button
                            type="submit"
                            disabled={!vm.formName().trim()}
                            class="px-4 py-2 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50"
                        >
                            {vm.editingId() ? "Update" : "Add"}
                        </button>
                        <Show when={vm.editingId()}>
                            <button
                                type="button"
                                onClick={() => vm.resetForm()}
                                class="px-4 py-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300"
                            >
                                Cancel
                            </button>
                        </Show>
                    </div>
                </form>

                {/* Item list */}
                <Show when={vm.loading()}>
                    <p class="text-stone-500">Loading...</p>
                </Show>

                <div class="space-y-2">
                    <For each={vm.items()}>
                        {(item) => (
                            <div class="bg-white rounded-lg shadow p-4 flex justify-between items-center">
                                <div>
                                    <p
                                        class={`font-medium ${item.available ? "text-stone-800" : "text-stone-400 line-through"}`}
                                    >
                                        {item.name}
                                    </p>
                                    <p class="text-xs text-stone-500">
                                        {item.category}
                                        {item.description ? ` — ${item.description}` : ""}
                                    </p>
                                </div>
                                <div class="flex gap-1">
                                    <button
                                        onClick={() => vm.handleToggleAvailability(item)}
                                        class={`px-2 py-1 rounded text-xs font-medium ${
                                            item.available
                                                ? "bg-green-100 text-green-700"
                                                : "bg-stone-100 text-stone-500"
                                        }`}
                                    >
                                        {item.available ? "Available" : "Unavailable"}
                                    </button>
                                    <button
                                        onClick={() => vm.startEdit(item)}
                                        class="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-medium hover:bg-amber-200"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => vm.handleDelete(item.id)}
                                        class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200"
                                    >
                                        Delete
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
