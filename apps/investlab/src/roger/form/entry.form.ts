import { z } from "zod";
import {
    editEntryDtoSchema,
    fieldsOf,
    newInstrumentDtoSchema,
    RogerState,
    type EntryCreateInput,
    type EntryField,
    type EntryRef,
    type EntryValues,
} from "@m0n0lab/investlab-roger";
import type { RogerFieldErrors } from "#roger/view-model/roger.view-model";
import type { Sector } from "@m0n0lab/investlab-catalog";

function blankToUndefined(value: unknown): unknown {
    return typeof value === "string" && value.trim() === "" ? undefined : value;
}

function toNumber(value: unknown): unknown {
    const present = blankToUndefined(value);
    return typeof present === "string" ? Number(present) : present;
}

const text = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(blankToUndefined, schema);
const numeric = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(toNumber, schema);

const edit = editEntryDtoSchema.shape;
const newInstrument = newInstrumentDtoSchema.shape;

const FIELD_SCHEMAS: Record<EntryField, z.ZodTypeAny> = {
    entryPrice: numeric(edit.entryPrice),
    quantity: numeric(edit.quantity),
    buyCommission: numeric(edit.buyCommission),
    buyDate: text(edit.buyDate),
    exitPrice: numeric(edit.exitPrice),
    sellCommission: numeric(edit.sellCommission),
    sellDate: text(edit.sellDate),
};

type Raw = Record<string, FormDataEntryValue>;
type FormSchema<T> = z.ZodType<T, z.ZodTypeDef, unknown>;

function valuesShape(state: RogerState): z.ZodRawShape {
    return Object.fromEntries(fieldsOf(state).map((field) => [field, FIELD_SCHEMAS[field]]));
}

const stateSchema = z.nativeEnum(RogerState);
const id = z.string().min(1);
const expectedUpdatedAt = text(edit.expectedUpdatedAt).transform((iso) => new Date(iso));

function withState<T>(
    raw: Raw,
    key: string,
    build: (state: RogerState) => FormSchema<T>,
): z.SafeParseReturnType<unknown, T> {
    const state = z.object({ [key]: stateSchema }).safeParse(raw);
    return state.success ? build(stateSchema.parse(raw[key])).safeParse(raw) : state;
}

const refShape = { id, state: stateSchema, expectedUpdatedAt };

function refOf(parsed: { id: string; state: RogerState; expectedUpdatedAt: Date }): EntryRef {
    return { id: parsed.id, state: parsed.state, updatedAt: parsed.expectedUpdatedAt };
}

function createSchema(state: RogerState): FormSchema<EntryCreateInput> {
    return z
        .object({
            state: z.literal(state),
            instrumentId: text(z.string().uuid()).optional(),
            symbol: text(newInstrument.symbol).optional(),
            name: text(newInstrument.name).optional(),
            sector: text(newInstrument.sector),
            ...valuesShape(state),
        })
        .superRefine((form, ctx) => {
            if (form["instrumentId"] === undefined && form["symbol"] === undefined) {
                ctx.addIssue({
                    code: "custom",
                    path: ["instrumentId"],
                    message: "Pick an instrument or add a new stock",
                });
            } else if (form["instrumentId"] === undefined && form["name"] === undefined) {
                ctx.addIssue({ code: "custom", path: ["name"], message: "Name is required" });
            }
        })
        .transform((form): EntryCreateInput => {
            const { instrumentId, symbol, name, sector, ...values } = form;
            const draft = { ...(values as EntryValues), state };
            return instrumentId !== undefined
                ? { ...draft, instrumentId }
                : {
                      ...draft,
                      newInstrument: {
                          symbol: symbol!,
                          name: name!,
                          ...(sector !== undefined && { sector: sector as Sector }),
                      },
                  };
        });
}

function updateSchema(state: RogerState): FormSchema<{ current: EntryRef; values: EntryValues }> {
    return z
        .object({ ...refShape, state: z.literal(state), ...valuesShape(state) })
        .transform((form) => {
            const { id: _id, state: _state, expectedUpdatedAt: _at, ...values } = form;
            return { current: refOf(form), values };
        });
}

function transitionSchema(
    to: RogerState,
): FormSchema<{ current: EntryRef; to: RogerState; values: EntryValues }> {
    return z.object({ ...refShape, to: z.literal(to), ...valuesShape(to) }).transform((form) => {
        const { id: _id, state: _state, expectedUpdatedAt: _at, to: _to, ...values } = form;
        return { current: refOf(form), to, values };
    });
}

const reEnterSchema = z
    .object({ id, state: stateSchema, ...valuesShape(RogerState.BuyOrder) })
    .transform((form) => {
        const { id: entryId, state, ...values } = form;
        return {
            current: { id: entryId, state },
            values,
        };
    });

const entryIdSchema = z.object({ id });

export const parseCreateEntryForm = (raw: Raw) => withState(raw, "state", createSchema);
export const parseUpdateEntryForm = (raw: Raw) => withState(raw, "state", updateSchema);
export const parseTransitionEntryForm = (raw: Raw) => withState(raw, "to", transitionSchema);
export const parseReEnterEntryForm = (raw: Raw) => reEnterSchema.safeParse(raw);
export const parseEntryIdForm = (raw: Raw) => entryIdSchema.safeParse(raw);

export type RogerActionResult = { ok: true } | { error: string; fieldErrors?: RogerFieldErrors };
