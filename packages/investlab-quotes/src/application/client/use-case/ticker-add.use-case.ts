import { inject, injectable } from "inversify";
import { QUOTES_PORTS } from "#application/client/tokens.ts";
import { Ticker } from "#domain/model/ticker.model.ts";
import type { TickerRepository } from "#domain/repository/ticker.repository.ts";
import type { ValidationError } from "@m0n0lab/investlab-core";
import type { Result } from "neverthrow";

export type TickerAddError = ValidationError;

@injectable()
export class TickerAddUseCase {
    constructor(
        @inject(QUOTES_PORTS.TickerRepository) private readonly tickerRepo: TickerRepository,
    ) {}

    /** Follows the symbol; a symbol already followed keeps its ticker. */
    execute(symbol: string): Result<Ticker, TickerAddError> {
        return Ticker.create(symbol).map((ticker) => {
            const followed = this.tickerRepo.findAll().find((t) => t.symbol === ticker.symbol);
            if (followed) {
                return followed;
            }
            this.tickerRepo.add(ticker);
            return ticker;
        });
    }
}
