import { z } from "zod";

export const quoteDtoSchema = z.object({
    symbol: z.string().min(1),
    price: z.number(),
    change: z.number(),
    changePercent: z.number(),
    updatedAt: z.string().datetime(),
});

export type QuoteDto = z.infer<typeof quoteDtoSchema>;

// `?symbols=AAPL,MSFT` → `["AAPL", "MSFT"]`.
export const quoteListQueryDtoSchema = z.object({
    symbols: z
        .string()
        .transform((raw) =>
            raw
                .split(",")
                .map((symbol) => symbol.trim())
                .filter(Boolean),
        )
        .pipe(z.array(z.string()).min(1, "At least one symbol is required")),
});

export type QuoteListQueryDto = z.infer<typeof quoteListQueryDtoSchema>;
