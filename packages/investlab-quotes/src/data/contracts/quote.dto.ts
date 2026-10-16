import { z } from "zod";

export const quoteDtoSchema = z.object({
    symbol: z.string().min(1),
    price: z.number(),
    change: z.number(),
    changePercent: z.number(),
    updatedAt: z.string().datetime(),
});

export type QuoteDto = z.infer<typeof quoteDtoSchema>;

export const QUOTE_LIST_MAX_SYMBOLS = 50;

export const quoteSymbolSchema = z.string().regex(/^[A-Za-z0-9.-]{1,15}$/, "Invalid symbol");

// `?symbols=AAPL,msft,AAPL` → `["AAPL", "MSFT"]`.
export const quoteListQueryDtoSchema = z.object({
    symbols: z
        .string()
        .transform((raw) =>
            raw
                .split(",")
                .map((symbol) => symbol.trim())
                .filter(Boolean),
        )
        .pipe(z.array(quoteSymbolSchema))
        .transform((symbols) => [...new Set(symbols.map((symbol) => symbol.toUpperCase()))])
        .pipe(
            z
                .array(z.string())
                .min(1, "At least one symbol is required")
                .max(QUOTE_LIST_MAX_SYMBOLS, `At most ${QUOTE_LIST_MAX_SYMBOLS} symbols`),
        ),
});

export type QuoteListQueryDto = z.infer<typeof quoteListQueryDtoSchema>;
