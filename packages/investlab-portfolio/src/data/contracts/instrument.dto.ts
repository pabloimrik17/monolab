import { z } from "zod";

// Wire values of the investlab-domain value objects; the contracts package stays domain-free.
const instrumentTypeSchema = z.enum(["etf", "index_fund", "stock", "crypto", "bond"]);
const assetClassSchema = z.enum(["equity", "fixed_income", "commodity", "crypto"]);
const sectorSchema = z.enum([
    "technology",
    "healthcare",
    "financial",
    "consumer_discretionary",
    "consumer_staples",
    "energy",
    "industrials",
    "materials",
    "real_estate",
    "utilities",
    "communication",
]);

export const instrumentDtoSchema = z.object({
    id: z.string().uuid(),
    symbol: z.string().min(1),
    name: z.string().min(1),
    type: instrumentTypeSchema,
    assetClass: assetClassSchema,
    exchange: z.string().optional(),
    sector: sectorSchema.optional(),
    replicates: z.string().optional(),
    quotable: z.boolean(),
});

export type InstrumentDto = z.infer<typeof instrumentDtoSchema>;
