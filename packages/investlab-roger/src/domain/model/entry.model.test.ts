import { afterEach, describe, expect, it, vi } from "vitest";
import { fieldsOf, RogerState } from "#domain/value-object/roger-state.value-object.ts";
import { makeEntry } from "#testing/shared/builder/entry.builder.ts";
import { Entry, type EntryValues } from "./entry.model.ts";

const {
    Watching: WATCHING,
    Shortlisted: SHORTLISTED,
    TraderBought: TRADER_BOUGHT,
    BuyOrder: BUY_ORDER,
    Invested: INVESTED,
    SellOrder: SELL_ORDER,
    Sold: SOLD,
} = RogerState;

const INSTRUMENT_ID = "00000000-0000-0000-0000-000000000001";

const SOLD_VALUES = {
    entryPrice: 150,
    quantity: 10,
    buyCommission: 2,
    buyDate: "2026-10-01",
    exitPrice: 180,
    sellCommission: 3,
    sellDate: "2026-11-01",
};

const PRICE_RULE = "must be greater than 0 and at most 9999999999.9999, with at most 4 decimals";
const COMMISSION_RULE = "must be 0 or more and at most 99999999.99, with at most 2 decimals";
const QUANTITY_RULE = "Quantity must be a whole number above 0 and at most 2147483647";

function tradeOf(entry: Entry) {
    return {
        state: entry.state,
        entryPrice: entry.entryPrice,
        quantity: entry.quantity,
        buyCommission: entry.buyCommission,
        buyDate: entry.buyDate,
        exitPrice: entry.exitPrice,
        sellCommission: entry.sellCommission,
        sellDate: entry.sellDate,
    };
}

function snapshotOf(entry: Entry) {
    return { ...tradeOf(entry), stateSince: entry.stateSince, updatedAt: entry.updatedAt };
}

function atTime(iso: string): Date {
    const now = new Date(iso);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    return now;
}

function soldDraft(overrides: EntryValues) {
    return { instrumentId: INSTRUMENT_ID, state: SOLD, ...SOLD_VALUES, ...overrides };
}

describe("Entry", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    describe("create", () => {
        it("creates a watching entry with only an entry price", () => {
            const entry = Entry.create({
                instrumentId: INSTRUMENT_ID,
                state: WATCHING,
                entryPrice: 150,
            })._unsafeUnwrap();

            expect(entry.id).toEqual(expect.any(String));
            expect(entry.instrumentId).toBe(INSTRUMENT_ID);
            expect(tradeOf(entry)).toEqual({ state: WATCHING, entryPrice: 150 });
        });

        it("loads an existing trade with the fields of its state", () => {
            const entry = Entry.create({
                instrumentId: INSTRUMENT_ID,
                state: INVESTED,
                entryPrice: 150,
                quantity: 10,
                buyCommission: 2,
                buyDate: "2026-10-01",
            })._unsafeUnwrap();

            expect(tradeOf(entry)).toEqual({
                state: INVESTED,
                entryPrice: 150,
                quantity: 10,
                buyCommission: 2,
                buyDate: "2026-10-01",
            });
        });

        it("ignores a supplied field the state does not carry", () => {
            const entry = Entry.create({
                instrumentId: INSTRUMENT_ID,
                state: WATCHING,
                entryPrice: 150,
                quantity: 10,
            })._unsafeUnwrap();

            expect(tradeOf(entry)).toEqual({ state: WATCHING, entryPrice: 150 });
        });

        it("gives each entry its own id", () => {
            expect(makeEntry().id).not.toBe(makeEntry().id);
        });

        it.each(fieldsOf(SOLD))("fails naming %s when it is missing", (field) => {
            const { [field]: _omitted, ...values } = SOLD_VALUES;

            const error = Entry.create({
                instrumentId: INSTRUMENT_ID,
                state: SOLD,
                ...values,
            })._unsafeUnwrapErr();

            expect(error).toMatchObject({ code: "MISSING_REQUIRED_FIELD", field });
        });
    });

    describe("validateDraft", () => {
        it("accepts a complete draft without an instrument", () => {
            expect(Entry.validateDraft({ state: WATCHING, entryPrice: 30 }).isOk()).toBe(true);
        });

        it("refuses a draft with a missing field", () => {
            expect(
                Entry.validateDraft({ state: BUY_ORDER, entryPrice: 30 })._unsafeUnwrapErr(),
            ).toMatchObject({ code: "MISSING_REQUIRED_FIELD", field: "quantity" });
        });

        it("refuses a draft with a value that breaks a rule", () => {
            expect(
                Entry.validateDraft({ state: WATCHING, entryPrice: 0 })._unsafeUnwrapErr().code,
            ).toBe("VALIDATION_ERROR");
        });
    });

    describe("field values", () => {
        it.each<[string, EntryValues]>([
            ["smallest entry price", { entryPrice: 0.0001 }],
            ["entry price with 4 decimals", { entryPrice: 1.2345 }],
            ["exit price with 4 decimals", { exitPrice: 1.2345 }],
            ["highest entry price", { entryPrice: 9_999_999_999.9999 }],
            ["highest exit price", { exitPrice: 9_999_999_999.9999 }],
            ["quantity of 1", { quantity: 1 }],
            ["highest quantity", { quantity: 2_147_483_647 }],
            ["highest buy commission", { buyCommission: 99_999_999.99 }],
            ["highest sell commission", { sellCommission: 99_999_999.99 }],
            ["free buy", { buyCommission: 0 }],
            ["free sale", { sellCommission: 0 }],
            ["buy commission with 2 decimals", { buyCommission: 1.23 }],
            ["sell commission with 2 decimals", { sellCommission: 1.23 }],
            ["sold the day it was bought", { buyDate: "2026-11-06", sellDate: "2026-11-06" }],
            ["leap day", { buyDate: "2028-02-29", sellDate: "2028-03-01" }],
        ])("accepts %s", (_case, overrides) => {
            expect(Entry.create(soldDraft(overrides)).isOk()).toBe(true);
        });

        it.each<[string, EntryValues, string]>([
            ["zero entry price", { entryPrice: 0 }, `Entry price ${PRICE_RULE}`],
            ["negative entry price", { entryPrice: -1 }, `Entry price ${PRICE_RULE}`],
            ["NaN entry price", { entryPrice: Number.NaN }, `Entry price ${PRICE_RULE}`],
            ["infinite entry price", { entryPrice: Infinity }, `Entry price ${PRICE_RULE}`],
            ["entry price with 5 decimals", { entryPrice: 1.23456 }, `Entry price ${PRICE_RULE}`],
            [
                "entry price over its limit",
                { entryPrice: 10_000_000_000 },
                `Entry price ${PRICE_RULE}`,
            ],
            [
                "exit price over its limit",
                { exitPrice: 10_000_000_000 },
                `Exit price ${PRICE_RULE}`,
            ],
            ["quantity over its limit", { quantity: 2_147_483_648 }, QUANTITY_RULE],
            [
                "buy commission over its limit",
                { buyCommission: 100_000_000 },
                `Buy commission ${COMMISSION_RULE}`,
            ],
            [
                "sell commission over its limit",
                { sellCommission: 100_000_000 },
                `Sell commission ${COMMISSION_RULE}`,
            ],
            ["zero exit price", { exitPrice: 0 }, `Exit price ${PRICE_RULE}`],
            ["exit price with 5 decimals", { exitPrice: 1.23456 }, `Exit price ${PRICE_RULE}`],
            ["fractional quantity", { quantity: 2.5 }, QUANTITY_RULE],
            ["zero quantity", { quantity: 0 }, QUANTITY_RULE],
            ["negative quantity", { quantity: -1 }, QUANTITY_RULE],
            [
                "negative buy commission",
                { buyCommission: -0.01 },
                `Buy commission ${COMMISSION_RULE}`,
            ],
            [
                "buy commission with 3 decimals",
                { buyCommission: 1.234 },
                `Buy commission ${COMMISSION_RULE}`,
            ],
            [
                "infinite buy commission",
                { buyCommission: Infinity },
                `Buy commission ${COMMISSION_RULE}`,
            ],
            [
                "negative sell commission",
                { sellCommission: -0.01 },
                `Sell commission ${COMMISSION_RULE}`,
            ],
            [
                "sell commission with 3 decimals",
                { sellCommission: 1.234 },
                `Sell commission ${COMMISSION_RULE}`,
            ],
            [
                "buy date that is no date",
                { buyDate: "soon" },
                "Buy date must be a calendar date (YYYY-MM-DD)",
            ],
            [
                "buy date in no month",
                { buyDate: "2026-13-01" },
                "Buy date must be a calendar date (YYYY-MM-DD)",
            ],
            [
                "buy date past the month's end",
                { buyDate: "2026-02-30" },
                "Buy date must be a calendar date (YYYY-MM-DD)",
            ],
            [
                "buy date with a time",
                { buyDate: "2026-10-01T00:00:00.000Z" },
                "Buy date must be a calendar date (YYYY-MM-DD)",
            ],
            [
                "sell date on a missing leap day",
                { sellDate: "2027-02-29" },
                "Sell date must be a calendar date (YYYY-MM-DD)",
            ],
            [
                "sold before bought",
                { buyDate: "2026-11-06", sellDate: "2026-11-05" },
                "Sell date cannot be before buy date",
            ],
        ])("refuses %s", (_case, overrides, message) => {
            const error = Entry.create(soldDraft(overrides))._unsafeUnwrapErr();

            expect(error.code).toBe("VALIDATION_ERROR");
            expect(error.message).toBe(message);
        });
    });

    describe("transition", () => {
        it.each<[string, RogerState, EntryValues, RogerState, EntryValues, EntryValues]>([
            ["between radar states", WATCHING, {}, TRADER_BOUGHT, {}, { entryPrice: 150 }],
            [
                "trader bought to a buy order",
                TRADER_BOUGHT,
                {},
                BUY_ORDER,
                { quantity: 5 },
                { entryPrice: 150, quantity: 5 },
            ],
            [
                "market buy",
                SHORTLISTED,
                {},
                INVESTED,
                { quantity: 10, buyCommission: 2, buyDate: "2026-11-06" },
                { entryPrice: 150, quantity: 10, buyCommission: 2, buyDate: "2026-11-06" },
            ],
            [
                "buy order filled keeps its current values",
                BUY_ORDER,
                { entryPrice: 148, quantity: 10 },
                INVESTED,
                { buyCommission: 2, buyDate: "2026-11-06" },
                { entryPrice: 148, quantity: 10, buyCommission: 2, buyDate: "2026-11-06" },
            ],
            [
                "buy order cancelled clears the quantity",
                BUY_ORDER,
                { quantity: 10 },
                SHORTLISTED,
                {},
                { entryPrice: 150 },
            ],
            [
                "sell order placed",
                INVESTED,
                {},
                SELL_ORDER,
                { exitPrice: 180 },
                {
                    entryPrice: 150,
                    quantity: 10,
                    buyCommission: 2,
                    buyDate: "2026-10-01",
                    exitPrice: 180,
                },
            ],
            [
                "manual sale",
                INVESTED,
                {},
                SOLD,
                { exitPrice: 180, sellCommission: 2, sellDate: "2026-11-06" },
                {
                    entryPrice: 150,
                    quantity: 10,
                    buyCommission: 2,
                    buyDate: "2026-10-01",
                    exitPrice: 180,
                    sellCommission: 2,
                    sellDate: "2026-11-06",
                },
            ],
            [
                "sell order filled",
                SELL_ORDER,
                {},
                SOLD,
                { sellCommission: 2, sellDate: "2026-11-06" },
                {
                    entryPrice: 150,
                    quantity: 10,
                    buyCommission: 2,
                    buyDate: "2026-10-01",
                    exitPrice: 180,
                    sellCommission: 2,
                    sellDate: "2026-11-06",
                },
            ],
            [
                "sell order cancelled clears the exit price and keeps the buy fields",
                SELL_ORDER,
                { exitPrice: 180 },
                INVESTED,
                {},
                { entryPrice: 150, quantity: 10, buyCommission: 2, buyDate: "2026-10-01" },
            ],
            [
                "a supplied value wins",
                SHORTLISTED,
                { entryPrice: 150 },
                BUY_ORDER,
                { entryPrice: 148, quantity: 10 },
                { entryPrice: 148, quantity: 10 },
            ],
            [
                "a supplied field the target lacks is cleared",
                WATCHING,
                {},
                SHORTLISTED,
                { quantity: 10 },
                { entryPrice: 150 },
            ],
        ])("%s", (_case, from, start, to, values, expected) => {
            const entry = makeEntry({ state: from, ...start });

            expect(entry.transition(to, values).isOk()).toBe(true);

            expect(tradeOf(entry)).toEqual({ state: to, ...expected });
        });

        it.each([
            [WATCHING, SELL_ORDER],
            [BUY_ORDER, SOLD],
            [INVESTED, WATCHING],
            [INVESTED, BUY_ORDER],
            [SELL_ORDER, BUY_ORDER],
            [SOLD, INVESTED],
            [WATCHING, WATCHING],
        ])("refuses %s → %s and changes nothing", (from, to) => {
            const entry = makeEntry({ state: from });
            const before = snapshotOf(entry);

            const error = entry.transition(to)._unsafeUnwrapErr();

            expect(error.code).toBe("INVALID_TRANSITION");
            expect(error.message).toBe(`An entry cannot move from ${from} to ${to}`);
            expect(snapshotOf(entry)).toEqual(before);
        });

        it("fails naming the missing field and changes nothing", () => {
            const entry = makeEntry({ state: WATCHING });
            const before = snapshotOf(entry);

            expect(entry.transition(BUY_ORDER)._unsafeUnwrapErr()).toMatchObject({
                code: "MISSING_REQUIRED_FIELD",
                field: "quantity",
            });
            expect(snapshotOf(entry)).toEqual(before);
        });

        it("refuses a value that breaks a rule and changes nothing", () => {
            const entry = makeEntry({ state: WATCHING });
            const before = snapshotOf(entry);

            expect(entry.transition(BUY_ORDER, { quantity: 2.5 })._unsafeUnwrapErr().code).toBe(
                "VALIDATION_ERROR",
            );
            expect(snapshotOf(entry)).toEqual(before);
        });

        it("refuses a sale dated before the kept buy date", () => {
            const entry = makeEntry({ state: SELL_ORDER, buyDate: "2026-11-06" });

            expect(
                entry
                    .transition(SOLD, { sellCommission: 2, sellDate: "2026-11-05" })
                    ._unsafeUnwrapErr().code,
            ).toBe("VALIDATION_ERROR");
        });

        it("defaults to no supplied values", () => {
            const entry = makeEntry({ state: BUY_ORDER });

            expect(entry.transition(WATCHING).isOk()).toBe(true);
            expect(entry.state).toBe(WATCHING);
        });
    });

    describe("edit", () => {
        it("changes a field of the current state and keeps the state", () => {
            const entry = makeEntry({ state: WATCHING });

            expect(entry.edit({ entryPrice: 145 }).isOk()).toBe(true);

            expect(tradeOf(entry)).toEqual({ state: WATCHING, entryPrice: 145 });
        });

        it("keeps the fields it is not given", () => {
            const entry = makeEntry({ state: SOLD, ...SOLD_VALUES });

            expect(entry.edit({ exitPrice: 190, sellCommission: 4 }).isOk()).toBe(true);

            expect(tradeOf(entry)).toEqual({
                state: SOLD,
                ...SOLD_VALUES,
                exitPrice: 190,
                sellCommission: 4,
            });
        });

        it("treats an undefined field as not given", () => {
            const entry = makeEntry({ state: WATCHING });

            expect(entry.edit({ quantity: undefined }).isOk()).toBe(true);
            expect(entry.edit({ entryPrice: undefined }).isOk()).toBe(true);

            expect(tradeOf(entry)).toEqual({ state: WATCHING, entryPrice: 150 });
        });

        it("refuses a field the state does not carry and changes nothing", () => {
            const entry = makeEntry({ state: WATCHING });
            const before = snapshotOf(entry);

            const error = entry.edit({ quantity: 10 })._unsafeUnwrapErr();

            expect(error).toMatchObject({ code: "FIELD_NOT_IN_STATE", field: "quantity" });
            expect(error.message).toBe("An entry in WATCHING has no quantity");
            expect(snapshotOf(entry)).toEqual(before);
        });

        it.each<[string, RogerState, EntryValues]>([
            ["a broken value", WATCHING, { entryPrice: 0 }],
            ["a sell date before the buy date", SOLD, { sellDate: "2026-09-30" }],
            ["a buy date after the sell date", SOLD, { buyDate: "2026-11-02" }],
        ])("refuses %s and changes nothing", (_case, state, values) => {
            const entry = makeEntry({ state });
            const before = snapshotOf(entry);

            expect(entry.edit(values)._unsafeUnwrapErr().code).toBe("VALIDATION_ERROR");
            expect(snapshotOf(entry)).toEqual(before);
        });
    });

    describe("reEnter", () => {
        it("creates a buy order for the same instrument with the supplied entry price", () => {
            const sold = makeEntry({ state: SOLD, ...SOLD_VALUES });
            const before = snapshotOf(sold);

            const entry = sold.reEnter({ entryPrice: 145 })._unsafeUnwrap();

            expect(entry.id).not.toBe(sold.id);
            expect(entry.instrumentId).toBe(sold.instrumentId);
            expect(tradeOf(entry)).toEqual({ state: BUY_ORDER, entryPrice: 145, quantity: 10 });
            expect(snapshotOf(sold)).toEqual(before);
        });

        it("takes the supplied quantity", () => {
            const sold = makeEntry({ state: SOLD, ...SOLD_VALUES });

            expect(tradeOf(sold.reEnter({ quantity: 5 })._unsafeUnwrap())).toEqual({
                state: BUY_ORDER,
                entryPrice: 150,
                quantity: 5,
            });
        });

        it("defaults to the sold entry's price and quantity", () => {
            const sold = makeEntry({ state: SOLD, ...SOLD_VALUES });

            expect(tradeOf(sold.reEnter()._unsafeUnwrap())).toEqual({
                state: BUY_ORDER,
                entryPrice: 150,
                quantity: 10,
            });
        });

        it("refuses a value that breaks a rule", () => {
            const sold = makeEntry({ state: SOLD });

            expect(sold.reEnter({ entryPrice: 0 })._unsafeUnwrapErr().code).toBe(
                "VALIDATION_ERROR",
            );
        });

        it.each([WATCHING, SHORTLISTED, TRADER_BOUGHT, BUY_ORDER, INVESTED, SELL_ORDER])(
            "refuses a re-entry from %s",
            (state) => {
                const error = makeEntry({ state }).reEnter()._unsafeUnwrapErr();

                expect(error.code).toBe("INVALID_TRANSITION");
                expect(error.message).toBe(
                    `Only a SOLD entry can be re-entered, not one in ${state}`,
                );
            },
        );
    });

    describe("time in state", () => {
        it("starts when the entry is created", () => {
            const now = atTime("2026-11-01T10:00:00.000Z");

            const entry = makeEntry();

            expect(entry.stateSince).toEqual(now);
            expect(entry.createdAt).toEqual(now);
            expect(entry.updatedAt).toEqual(now);
        });

        it("resets on a transition", () => {
            const created = atTime("2026-11-01T10:00:00.000Z");
            const entry = makeEntry({ state: BUY_ORDER });
            const now = atTime("2026-11-06T10:00:00.000Z");

            entry.transition(INVESTED, { buyCommission: 2, buyDate: "2026-11-06" });

            expect(entry.stateSince).toEqual(now);
            expect(entry.updatedAt).toEqual(now);
            expect(entry.createdAt).toEqual(created);
        });

        it("stays when fields are edited, while updatedAt moves", () => {
            const created = atTime("2026-11-01T10:00:00.000Z");
            const entry = makeEntry();
            const now = atTime("2026-11-06T10:00:00.000Z");

            entry.edit({ entryPrice: 145 });

            expect(entry.stateSince).toEqual(created);
            expect(entry.updatedAt).toEqual(now);
        });

        it("starts anew on a re-entry", () => {
            atTime("2026-11-01T10:00:00.000Z");
            const sold = makeEntry({ state: SOLD });
            const now = atTime("2026-11-06T10:00:00.000Z");

            const entry = sold.reEnter()._unsafeUnwrap();

            expect(entry.stateSince).toEqual(now);
            expect(entry.createdAt).toEqual(now);
        });
    });

    describe("reconstitute", () => {
        it("hydrates from raw props without validation", () => {
            const stateSince = new Date("2026-11-01");
            const createdAt = new Date("2026-10-01");
            const updatedAt = new Date("2026-11-02");

            const entry = Entry.reconstitute({
                id: "entry-1",
                instrumentId: INSTRUMENT_ID,
                state: SOLD,
                ...SOLD_VALUES,
                entryPrice: -1,
                stateSince,
                createdAt,
                updatedAt,
            });

            expect(entry.id).toBe("entry-1");
            expect(entry.instrumentId).toBe(INSTRUMENT_ID);
            expect(tradeOf(entry)).toEqual({ state: SOLD, ...SOLD_VALUES, entryPrice: -1 });
            expect(entry.stateSince).toEqual(stateSince);
            expect(entry.createdAt).toEqual(createdAt);
            expect(entry.updatedAt).toEqual(updatedAt);
        });
    });
});
