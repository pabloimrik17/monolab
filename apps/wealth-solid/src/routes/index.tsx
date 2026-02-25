import type { Quote, Ticker } from "@m0n0lab/wealth-tracker-core";
import { createSignal, onCleanup, onMount } from "solid-js";
import AddTicker from "~/components/add-ticker";
import RefreshIndicator from "~/components/refresh-indicator";
import TickerList from "~/components/ticker-list";
import { createWealthServices } from "~/lib/wealth";

export default function Home() {
    const [tickers, setTickers] = createSignal<Ticker[]>([]);
    const [quotes, setQuotes] = createSignal<Map<string, Quote>>(new Map());
    const [lastUpdate, setLastUpdate] = createSignal<Date | null>(null);
    const [error, setError] = createSignal<string | null>(null);

    let services: ReturnType<typeof createWealthServices> | null = null;

    onMount(() => {
        services = createWealthServices(
            (newQuotes) => {
                setQuotes(newQuotes);
                setLastUpdate(new Date());
                setError(null);
            },
            (err) => setError(err.message)
        );

        const currentTickers = services.store.getTickers();
        setTickers(currentTickers);

        if (currentTickers.length > 0) {
            services.poller.start(currentTickers.map((t) => t.symbol));
        }
    });

    onCleanup(() => {
        services?.poller.stop();
    });

    const handleAdd = (symbol: string) => {
        if (!services) return;
        services.store.add(symbol);
        const updated = services.store.getTickers();
        setTickers(updated);

        const symbols = updated.map((t) => t.symbol);
        if (services.poller.isPolling()) {
            services.poller.setTickers(symbols);
        } else {
            services.poller.start(symbols);
        }
    };

    const handleRemove = (symbol: string) => {
        if (!services) return;
        services.store.remove(symbol);
        const updated = services.store.getTickers();
        setTickers(updated);

        if (updated.length === 0) {
            services.poller.stop();
        } else {
            services.poller.setTickers(updated.map((t) => t.symbol));
        }
    };

    return (
        <main>
            <h1>Wealth Tracker</h1>
            <AddTicker onAdd={handleAdd} />
            <RefreshIndicator lastUpdate={lastUpdate()} />
            {error() && <div class="error">{error()}</div>}
            <TickerList
                tickers={tickers()}
                quotes={quotes()}
                onRemove={handleRemove}
            />
        </main>
    );
}
