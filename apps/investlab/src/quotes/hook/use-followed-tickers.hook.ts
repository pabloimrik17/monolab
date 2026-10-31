import { useEffect, useState } from "react";
import { getContainer, QUOTES } from "../../di/container.client";
import type { Ticker } from "@m0n0lab/investlab-quotes";

/** The followed tickers, read from browser storage after mount so server render never touches it. */
export function useFollowedTickers() {
    const [tickers, setTickers] = useState<Ticker[]>([]);

    useEffect(() => {
        setTickers(getContainer().get(QUOTES.TickerList).execute());
    }, []);

    function add(symbol: string): void {
        const container = getContainer();
        container.get(QUOTES.TickerAdd).execute(symbol);
        setTickers(container.get(QUOTES.TickerList).execute());
    }

    function remove(symbol: string): void {
        const container = getContainer();
        container.get(QUOTES.TickerRemove).execute(symbol);
        setTickers(container.get(QUOTES.TickerList).execute());
    }

    return { tickers, add, remove };
}
