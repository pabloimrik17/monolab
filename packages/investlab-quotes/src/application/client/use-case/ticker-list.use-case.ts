import { inject, injectable } from "inversify";
import { QUOTES_PORTS } from "#application/client/tokens.ts";
import type { Ticker } from "#domain/model/ticker.model.ts";
import type { TickerRepository } from "#domain/repository/ticker.repository.ts";

@injectable()
export class TickerListUseCase {
    constructor(
        @inject(QUOTES_PORTS.TickerRepository) private readonly tickerRepo: TickerRepository,
    ) {}

    /** The followed tickers, alphabetical by symbol. */
    execute(): Ticker[] {
        return this.tickerRepo.findAll().sort((a, b) => a.symbol.localeCompare(b.symbol));
    }
}
