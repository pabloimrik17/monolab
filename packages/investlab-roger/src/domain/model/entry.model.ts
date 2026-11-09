import { err, ok, type Result } from "neverthrow";
import {
    FieldNotInStateError,
    InvalidTransitionError,
    MissingRequiredFieldError,
} from "#domain/error/entry.error.ts";
import {
    fieldsOf,
    RogerState,
    transitionsFrom,
} from "#domain/value-object/roger-state.value-object.ts";
import { ValidationError } from "@m0n0lab/investlab-core";

/** An entry's trade fields. Dates are calendar dates, `YYYY-MM-DD`; `undefined` means not given. */
export interface EntryValues {
    entryPrice?: number | undefined;
    quantity?: number | undefined;
    buyCommission?: number | undefined;
    buyDate?: string | undefined;
    exitPrice?: number | undefined;
    sellCommission?: number | undefined;
    sellDate?: string | undefined;
}

interface StateValues extends EntryValues {
    entryPrice: number;
}

export interface EntryProps extends StateValues {
    id: string;
    instrumentId: string;
    state: RogerState;
    stateSince: Date;
    createdAt: Date;
    updatedAt: Date;
}

/** A new entry before it has an instrument. */
export interface EntryDraft extends EntryValues {
    state: RogerState;
}

const PRICE_DECIMALS = 4;
const COMMISSION_DECIMALS = 2;
// Mirror the roger_entries column limits: numeric(14,4), numeric(10,2) and integer.
const PRICE_MAX = 9_999_999_999.9999;
const COMMISSION_MAX = 99_999_999.99;
const QUANTITY_MAX = 2_147_483_647;
const CALENDAR_DATE_LENGTH = "YYYY-MM-DD".length;
const EVERY_FIELD = fieldsOf(RogerState.Sold);

function hasAtMostDecimals(value: number, decimals: number): boolean {
    return Number(value.toFixed(decimals)) === value;
}

function isPrice(value: number): boolean {
    return value > 0 && value <= PRICE_MAX && hasAtMostDecimals(value, PRICE_DECIMALS);
}

function isCommission(value: number): boolean {
    return value >= 0 && value <= COMMISSION_MAX && hasAtMostDecimals(value, COMMISSION_DECIMALS);
}

function isQuantity(value: number): boolean {
    return Number.isInteger(value) && value > 0 && value <= QUANTITY_MAX;
}

// Round-tripping refuses what `Date` rolls over, such as February 30.
function isCalendarDate(value: string): boolean {
    const date = new Date(value);
    return (
        !Number.isNaN(date.getTime()) && date.toISOString().slice(0, CALENDAR_DATE_LENGTH) === value
    );
}

function breaks<T>(value: T | undefined, isValid: (value: T) => boolean): boolean {
    return value !== undefined && !isValid(value);
}

const PRICE_RULE = `must be greater than 0 and at most ${PRICE_MAX}, with at most ${PRICE_DECIMALS} decimals`;
const COMMISSION_RULE = `must be 0 or more and at most ${COMMISSION_MAX}, with at most ${COMMISSION_DECIMALS} decimals`;
const DATE_RULE = "must be a calendar date (YYYY-MM-DD)";

const VALUE_RULES: ReadonlyArray<readonly [(values: EntryValues) => boolean, string]> = [
    [({ entryPrice }) => breaks(entryPrice, isPrice), `Entry price ${PRICE_RULE}`],
    [({ exitPrice }) => breaks(exitPrice, isPrice), `Exit price ${PRICE_RULE}`],
    [
        ({ quantity }) => breaks(quantity, isQuantity),
        `Quantity must be a whole number above 0 and at most ${QUANTITY_MAX}`,
    ],
    [
        ({ buyCommission }) => breaks(buyCommission, isCommission),
        `Buy commission ${COMMISSION_RULE}`,
    ],
    [
        ({ sellCommission }) => breaks(sellCommission, isCommission),
        `Sell commission ${COMMISSION_RULE}`,
    ],
    [({ buyDate }) => breaks(buyDate, isCalendarDate), `Buy date ${DATE_RULE}`],
    [({ sellDate }) => breaks(sellDate, isCalendarDate), `Sell date ${DATE_RULE}`],
    [
        ({ buyDate, sellDate }) =>
            buyDate !== undefined && sellDate !== undefined && sellDate < buyDate,
        "Sell date cannot be before buy date",
    ],
];

function validated(values: StateValues): Result<StateValues, ValidationError> {
    const broken = VALUE_RULES.find(([isBroken]) => isBroken(values));
    return broken ? err(new ValidationError(broken[1])) : ok(values);
}

/** The values of `state`: supplied first, then current. Anything else is left out, so it clears. */
function fill(
    state: RogerState,
    supplied: EntryValues,
    current: EntryValues,
): Result<StateValues, MissingRequiredFieldError> {
    const filled: EntryValues = {};
    for (const field of fieldsOf(state)) {
        const value = supplied[field] ?? current[field];
        if (value === undefined) {
            return err(new MissingRequiredFieldError(field));
        }
        Object.assign(filled, { [field]: value });
    }

    // Every state carries the entry price, so the loop has set it.
    return ok(filled as StateValues);
}

function draftValues(
    draft: EntryDraft,
): Result<StateValues, ValidationError | MissingRequiredFieldError> {
    return fill(draft.state, draft, {}).andThen(validated);
}

export class Entry {
    readonly id: string;
    readonly instrumentId: string;
    readonly createdAt: Date;
    private _state: RogerState;
    private _values: StateValues;
    private _stateSince: Date;
    private _updatedAt: Date;

    private constructor({
        id,
        instrumentId,
        state,
        stateSince,
        createdAt,
        updatedAt,
        ...values
    }: EntryProps) {
        this.id = id;
        this.instrumentId = instrumentId;
        this.createdAt = createdAt;
        this._state = state;
        this._values = values;
        this._stateSince = stateSince;
        this._updatedAt = updatedAt;
    }

    get state(): RogerState {
        return this._state;
    }
    get entryPrice(): number {
        return this._values.entryPrice;
    }
    get quantity(): number | undefined {
        return this._values.quantity;
    }
    get buyCommission(): number | undefined {
        return this._values.buyCommission;
    }
    get buyDate(): string | undefined {
        return this._values.buyDate;
    }
    get exitPrice(): number | undefined {
        return this._values.exitPrice;
    }
    get sellCommission(): number | undefined {
        return this._values.sellCommission;
    }
    get sellDate(): string | undefined {
        return this._values.sellDate;
    }
    get stateSince(): Date {
        return this._stateSince;
    }
    get updatedAt(): Date {
        return this._updatedAt;
    }

    /** Lets a caller refuse an invalid entry before it creates the instrument the entry needs. */
    static validateDraft(
        draft: EntryDraft,
    ): Result<void, ValidationError | MissingRequiredFieldError> {
        return draftValues(draft).map(() => undefined);
    }

    static create(
        draft: EntryDraft & { instrumentId: string },
    ): Result<Entry, ValidationError | MissingRequiredFieldError> {
        return draftValues(draft).map((values) => {
            const now = new Date();
            return new Entry({
                ...values,
                id: crypto.randomUUID(),
                instrumentId: draft.instrumentId,
                state: draft.state,
                stateSince: now,
                createdAt: now,
                updatedAt: now,
            });
        });
    }

    static reconstitute(props: EntryProps): Entry {
        return new Entry(props);
    }

    edit(
        values: EntryValues,
    ): Result<void, ValidationError | FieldNotInStateError | MissingRequiredFieldError> {
        const carried = fieldsOf(this._state);
        const stray = EVERY_FIELD.find(
            (field) => values[field] !== undefined && !carried.includes(field),
        );
        if (stray) {
            return err(new FieldNotInStateError(stray, this._state));
        }

        return fill(this._state, values, this._values)
            .andThen(validated)
            .map((next) => {
                this._values = next;
                this._updatedAt = new Date();
            });
    }

    transition(
        to: RogerState,
        values: EntryValues = {},
    ): Result<void, ValidationError | InvalidTransitionError | MissingRequiredFieldError> {
        if (!transitionsFrom(this._state).includes(to)) {
            return err(new InvalidTransitionError(this._state, to));
        }

        return fill(to, values, this._values)
            .andThen(validated)
            .map((next) => {
                const now = new Date();
                this._state = to;
                this._values = next;
                this._stateSince = now;
                this._updatedAt = now;
            });
    }

    /** A new `BUY_ORDER` entry for the same instrument; this entry stays as it is. */
    reEnter(
        values: Pick<EntryValues, "entryPrice" | "quantity"> = {},
    ): Result<Entry, ValidationError | InvalidTransitionError | MissingRequiredFieldError> {
        if (this._state !== RogerState.Sold) {
            return err(new InvalidTransitionError(this._state));
        }

        return Entry.create({
            instrumentId: this.instrumentId,
            state: RogerState.BuyOrder,
            entryPrice: values.entryPrice ?? this.entryPrice,
            quantity: values.quantity ?? this.quantity,
        });
    }
}
