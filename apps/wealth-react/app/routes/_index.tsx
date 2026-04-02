import { useEffect, useRef, useState } from "react";
import { AddTicker } from "../components/add-ticker";
import { RefreshIndicator } from "../components/refresh-indicator";
import { TickerList } from "../components/ticker-list";
import { createPoller, tickerStore } from "../lib/wealth";
import type { Quote, Ticker } from "../lib/wealth";
export default function Index() {
    const [tickers, setTickers] = useState<Ticker[]>(() => tickerStore.getTickers());
    const [quotes, setQuotes] = useState<Map<string, Quote>>(new Map());
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [isPolling, setIsPolling] = useState(false);
    const pollerRef = useRef<ReturnType<typeof createPoller> | null>(null);

    useEffect(() => {
        const poller = createPoller(
            (newQuotes) => {
                setQuotes(newQuotes);
                setLastUpdate(new Date());
            },
            (error) => {
                console.error("Quote polling error:", error);
            },
        );
        pollerRef.current = poller;

        const symbols = tickers.map((t) => t.symbol);
        if (symbols.length > 0) {
            poller.start(symbols);
            setIsPolling(true);
        }

        return () => {
            poller.stop();
            setIsPolling(false);
        };
    }, []);

    useEffect(() => {
        const poller = pollerRef.current;
        if (!poller) return;

        const symbols = tickers.map((t) => t.symbol);
        if (symbols.length === 0) {
            poller.stop();
            setIsPolling(false);
        } else if (poller.isPolling()) {
            poller.setTickers(symbols);
        } else {
            poller.start(symbols);
            setIsPolling(true);
        }
    }, [tickers]);

    function handleAdd(symbol: string) {
        tickerStore.add(symbol);
        setTickers(tickerStore.getTickers());
    }

    function handleRemove(symbol: string) {
        tickerStore.remove(symbol);
        setTickers(tickerStore.getTickers());
    }

    return (
        <div className="app">
            <h1>Wealth Tracker</h1>
            <AddTicker onAdd={handleAdd} />
            <RefreshIndicator
                lastUpdate={lastUpdate}
                isPolling={isPolling}
            />
            <TickerList
                tickers={tickers}
                quotes={quotes}
                onRemove={handleRemove}
            />
        </div>
    );
}
