import { useNavigate } from "@solidjs/router";
import { createEffect, Show } from "solid-js";
import { useViewModel } from "@m0n0lab/solid-clean";
import { container } from "../../container.ts";
import { TOKENS } from "../../tokens.ts";
import type { AdminLoginViewModel } from "../../view-models/admin-login.viewmodel.ts";

export default function AdminLoginPage() {
    const navigate = useNavigate();

    const vm = useViewModel(() => container.get<AdminLoginViewModel>(TOKENS.AdminLoginViewModel));

    createEffect(() => {
        if (vm.authenticated()) {
            navigate("/admin/dashboard");
        }
    });

    const handleSubmit = (e: SubmitEvent) => {
        e.preventDefault();
        vm.submitLogin();
    };

    return (
        <main class="min-h-screen bg-stone-50 flex items-center justify-center p-4">
            <div class="w-full max-w-sm space-y-6 text-center">
                <div>
                    <h1 class="text-3xl font-bold text-stone-900">Admin</h1>
                    <p class="mt-1 text-stone-500">Enter PIN to continue</p>
                </div>

                <Show when={vm.error()}>
                    <p class="text-red-600">{vm.error()}</p>
                </Show>

                <form
                    onSubmit={handleSubmit}
                    class="space-y-4"
                >
                    <label
                        for="admin-pin"
                        class="sr-only"
                    >
                        PIN
                    </label>
                    <input
                        id="admin-pin"
                        type="password"
                        inputMode="numeric"
                        placeholder="PIN"
                        value={vm.pin()}
                        onInput={(e) => vm.setPin(e.currentTarget.value)}
                        class="w-full px-4 py-3 border border-stone-300 rounded-lg text-center text-lg tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-amber-500"
                        maxLength={6}
                        autocomplete="off"
                    />
                    <button
                        type="submit"
                        disabled={vm.loading() || !vm.pin()}
                        class="w-full py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                    >
                        {vm.loading() ? "Logging in..." : "Login"}
                    </button>
                </form>

                <a
                    href="/"
                    class="inline-block text-sm text-stone-500 hover:text-stone-700 underline"
                >
                    Back to home
                </a>
            </div>
        </main>
    );
}
