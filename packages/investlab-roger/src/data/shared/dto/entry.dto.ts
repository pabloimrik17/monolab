import { z } from "zod";
import { createInstrumentDtoSchema, instrumentDtoSchema } from "@m0n0lab/investlab-catalog";

const rogerStateSchema = z.enum([
    "WATCHING",
    "SHORTLISTED",
    "TRADER_BOUGHT",
    "BUY_ORDER",
    "INVESTED",
    "SELL_ORDER",
    "SOLD",
]);

const hasAtMostDecimals = (decimals: number) => (value: number) =>
    Number(value.toFixed(decimals)) === value;

// Mirror the roger_entries column limits: numeric(14,4), numeric(10,2) and integer.
const priceSchema = z
    .number()
    .gt(0)
    .max(9_999_999_999.9999)
    .refine(hasAtMostDecimals(4), "At most 4 decimals");
const commissionSchema = z
    .number()
    .min(0)
    .max(99_999_999.99)
    .refine(hasAtMostDecimals(2), "At most 2 decimals");
const quantitySchema = z.number().int().gt(0).max(2_147_483_647);
// Calendar validity (February 30) is the domain's rule.
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

// A state's value fields stay optional on requests: which ones it needs is the domain's rule
// (`MISSING_REQUIRED_FIELD`), not a validation error.
const entryValuesShape = {
    entryPrice: priceSchema.optional(),
    quantity: quantitySchema.optional(),
    buyCommission: commissionSchema.optional(),
    buyDate: dateSchema.optional(),
    exitPrice: priceSchema.optional(),
    sellCommission: commissionSchema.optional(),
    sellDate: dateSchema.optional(),
};

export const entryDtoSchema = z.object({
    id: z.string().uuid(),
    instrumentId: z.string().uuid(),
    state: rogerStateSchema,
    ...entryValuesShape,
    // Every state carries the entry price.
    entryPrice: priceSchema,
    stateSince: z.string().datetime(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export type EntryDto = z.infer<typeof entryDtoSchema>;

/** Which entries the list returns; `active` unless asked otherwise, an unknown value fails validation. */
export const entryListViewSchema = z.enum(["active", "history"]).default("active");

export const entryWithInstrumentDtoSchema = z.object({
    entry: entryDtoSchema,
    instrument: instrumentDtoSchema.pick({ symbol: true, name: true, sector: true }),
});

export type EntryWithInstrumentDto = z.infer<typeof entryWithInstrumentDtoSchema>;

export const entryListDtoSchema = z.array(entryWithInstrumentDtoSchema);

export type EntryListDto = z.infer<typeof entryListDtoSchema>;

export const newInstrumentDtoSchema = createInstrumentDtoSchema.pick({
    symbol: true,
    name: true,
    sector: true,
});

export const createEntryDtoSchema = z
    .object({
        state: rogerStateSchema,
        ...entryValuesShape,
        instrumentId: z.string().uuid().optional(),
        newInstrument: newInstrumentDtoSchema.optional(),
    })
    .refine((dto) => (dto.instrumentId === undefined) !== (dto.newInstrument === undefined), {
        message: "Give either instrumentId or newInstrument, not both or neither",
        path: ["instrumentId"],
    });

export type CreateEntryDto = z.infer<typeof createEntryDtoSchema>;

// Optimistic lock: the `updatedAt` the caller last read; a mismatch answers 409.
const expectedUpdatedAtShape = { expectedUpdatedAt: z.string().datetime() };

export const editEntryDtoSchema = z.object({
    ...entryValuesShape,
    ...expectedUpdatedAtShape,
});

export type EditEntryDto = z.infer<typeof editEntryDtoSchema>;

export const transitionEntryDtoSchema = z.object({
    to: rogerStateSchema,
    ...entryValuesShape,
    ...expectedUpdatedAtShape,
});

export type TransitionEntryDto = z.infer<typeof transitionEntryDtoSchema>;

export const reEnterEntryDtoSchema = z.object({
    entryPrice: entryValuesShape.entryPrice,
    quantity: entryValuesShape.quantity,
});

export type ReEnterEntryDto = z.infer<typeof reEnterEntryDtoSchema>;
