import { inject, injectable } from "inversify";
import { QUOTES_PORTS } from "#application/client/tokens.ts";
import type { Ticker } from "#domain/model/ticker.model.ts";
import type { TickerRepository } from "#domain/repository/ticker.repository.ts";

@injectable()
export class TickerAddUseCase {
    constructor(
        @inject(QUOTES_PORTS.TickerRepository) private readonly tickerRepo: TickerRepository,
    ) {}

    /** Follows the symbol, uppercased; a symbol already followed keeps its ticker. */
    execute(symbol: string): Ticker {
        const normalized = symbol.toUpperCase();
        const followed = this.tickerRepo.findAll().find((t) => t.symbol === normalized);
        if (followed) {
            return followed;
        }
        const ticker: Ticker = { symbol: normalized, addedAt: new Date() };
        this.tickerRepo.add(ticker);
        return ticker;
    }
}
