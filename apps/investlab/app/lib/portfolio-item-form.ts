import { z } from "zod";
import {
    createPortfolioItemDtoSchema,
    portfolioItemDtoSchema,
    updatePortfolioItemDtoSchema,
} from "@m0n0lab/investlab-data-contracts";

// Bounds come from the DTO schemas; this layer only adapts FormData strings to them.
function blankToUndefined(value: unknown): unknown {
    return typeof value === "string" && value.trim() === "" ? undefined : value;
}

function toNumber(value: unknown): unknown {
    const present = blankToUndefined(value);
    return typeof present === "string" ? Number(present) : present;
}

const text = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(blankToUndefined, schema);
const numeric = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(toNumber, schema);

const create = createPortfolioItemDtoSchema.shape;
// The edit form always submits every field, so only notes may be left blank (to clear them).
const update = updatePortfolioItemDtoSchema.required({
    broker: true,
    targetWeight: true,
    currentValue: true,
}).shape;
const id = text(portfolioItemDtoSchema.shape.id);

export const createPortfolioItemFormSchema = z.object({
    instrumentId: text(create.instrumentId),
    broker: text(create.broker),
    targetWeight: numeric(create.targetWeight),
    currentValue: numeric(create.currentValue),
    notes: text(create.notes),
});

export const updatePortfolioItemFormSchema = z.object({
    id,
    broker: text(update.broker),
    targetWeight: numeric(update.targetWeight),
    currentValue: numeric(update.currentValue),
    // A blank field already maps to undefined (clear); forms never send the wire `null`.
    notes: text(create.notes),
});

export const portfolioItemIdFormSchema = z.object({ id });
