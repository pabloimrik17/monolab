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

// Mirror the instruments column limits: symbol varchar(20), name varchar(200), exchange varchar(20), replicates varchar(200).
const symbolSchema = z.string().trim().min(1).max(20);
const nameSchema = z.string().trim().min(1).max(200);
const exchangeSchema = z.string().trim().min(1).max(20);
const replicatesSchema = z.string().trim().min(1).max(200);

export const createInstrumentDtoSchema = z.object({
    symbol: symbolSchema,
    name: nameSchema,
    type: instrumentTypeSchema,
    assetClass: assetClassSchema,
    exchange: exchangeSchema.optional(),
    sector: sectorSchema.optional(),
    replicates: replicatesSchema.optional(),
    quotable: z.boolean().optional(),
});

export type CreateInstrumentDto = z.infer<typeof createInstrumentDtoSchema>;

export const updateInstrumentDtoSchema = z.object({
    symbol: symbolSchema.optional(),
    name: nameSchema.optional(),
    type: instrumentTypeSchema.optional(),
    assetClass: assetClassSchema.optional(),
    // Omitted keeps the field; `null` clears it (JSON has no `undefined`).
    exchange: exchangeSchema.nullable().optional(),
    sector: sectorSchema.nullable().optional(),
    replicates: replicatesSchema.nullable().optional(),
    quotable: z.boolean().optional(),
});

export type UpdateInstrumentDto = z.infer<typeof updateInstrumentDtoSchema>;
