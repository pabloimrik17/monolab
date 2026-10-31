import { AddTicker } from "../component/add-ticker.component";
import { RefreshIndicator } from "../component/refresh-indicator.component";
import { TickerList } from "../component/ticker-list.component";
import { useFollowedTickers } from "../hook/use-followed-tickers.hook";
import { useQuotePolling } from "../hook/use-quote-polling.hook";

export default function TickerPage() {
    const { tickers, add, remove } = useFollowedTickers();
    const { quotes, lastUpdate, isPolling } = useQuotePolling(tickers);

    return (
        <div className="app">
            <h1>Wealth Tracker</h1>
            <AddTicker onAdd={add} />
            <RefreshIndicator
                lastUpdate={lastUpdate}
                isPolling={isPolling}
            />
            <TickerList
                tickers={tickers}
                quotes={quotes}
                onRemove={remove}
            />
        </div>
    );
}
