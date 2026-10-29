import { inject, injectable } from "inversify";
import { QUOTES_PORTS } from "#application/client/tokens.ts";
import type { TickerRepository } from "#domain/repository/ticker.repository.ts";

@injectable()
export class TickerRemoveUseCase {
    constructor(
        @inject(QUOTES_PORTS.TickerRepository) private readonly tickerRepo: TickerRepository,
    ) {}

    /** Unfollows the symbol, uppercased; a symbol not followed is left as is. */
    execute(symbol: string): void {
        this.tickerRepo.remove(symbol.toUpperCase());
    }
}
