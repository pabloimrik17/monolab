import { useNavigate } from "@solidjs/router";
import { createSignal } from "solid-js";

export default function Home() {
    const navigate = useNavigate();
    const [code, setCode] = createSignal("");
    const normalizedCode = () => code().trim().toUpperCase();

    const handleJoin = (e: SubmitEvent) => {
        e.preventDefault();
        if (normalizedCode()) {
            navigate(`/session/${encodeURIComponent(normalizedCode())}`);
        }
    };

    return (
        <main class="min-h-screen bg-stone-50 p-4 flex items-center">
            <div class="w-full max-w-sm mx-auto space-y-8 text-center">
                <div>
                    <h1 class="text-4xl font-bold text-stone-900">Qup</h1>
                    <p class="text-stone-500 mt-2">Order your drink from your phone</p>
                </div>

                <form
                    onSubmit={handleJoin}
                    class="space-y-3"
                >
                    <input
                        type="text"
                        aria-label="Session code"
                        placeholder="Session code"
                        maxLength={6}
                        autocomplete="off"
                        autocapitalize="characters"
                        value={code()}
                        onInput={(e) => setCode(e.currentTarget.value)}
                        class="w-full px-4 py-3 border border-stone-300 rounded-lg text-center text-xl font-mono uppercase tracking-[0.3em] placeholder:text-base placeholder:font-sans placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                        type="submit"
                        disabled={!normalizedCode()}
                        class="w-full py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                    >
                        Join session
                    </button>
                </form>

                <a
                    href="/admin"
                    class="inline-block py-2 text-sm text-stone-400 hover:text-stone-600"
                >
                    Host login
                </a>
            </div>
        </main>
    );
}
