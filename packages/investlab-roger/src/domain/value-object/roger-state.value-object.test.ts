import { describe, expect, it } from "vitest";
import { fieldsOf, RADAR_STATES, RogerState, transitionsFrom } from "./roger-state.value-object.ts";

const {
    Watching: WATCHING,
    Shortlisted: SHORTLISTED,
    TraderBought: TRADER_BOUGHT,
    BuyOrder: BUY_ORDER,
    Invested: INVESTED,
    SellOrder: SELL_ORDER,
    Sold: SOLD,
} = RogerState;

const STATES = [WATCHING, SHORTLISTED, TRADER_BOUGHT, BUY_ORDER, INVESTED, SELL_ORDER, SOLD];

// Rows: from; columns: to, in STATES order. 1 = allowed.
// prettier-ignore
const TRANSITION_TABLE: Record<RogerState, readonly (0 | 1)[]> = {
    //               WAT SHO TRA BUY INV SEL SOL
    [WATCHING]:      [0,  1,  1,  1,  1,  0,  0],
    [SHORTLISTED]:   [1,  0,  1,  1,  1,  0,  0],
    [TRADER_BOUGHT]: [1,  1,  0,  1,  1,  0,  0],
    [BUY_ORDER]:     [1,  1,  1,  0,  1,  0,  0],
    [INVESTED]:      [0,  0,  0,  0,  0,  1,  1],
    [SELL_ORDER]:    [0,  0,  0,  0,  1,  0,  1],
    [SOLD]:          [0,  0,  0,  0,  0,  0,  0],
};

const TRANSITION_CASES = STATES.flatMap((from) =>
    STATES.map((to, column) => [from, to, TRANSITION_TABLE[from][column] === 1] as const),
);

describe("rogerState", () => {
    describe("RogerState", () => {
        it("lists exactly the seven states", () => {
            expect(Object.values(RogerState)).toEqual([
                "WATCHING",
                "SHORTLISTED",
                "TRADER_BOUGHT",
                "BUY_ORDER",
                "INVESTED",
                "SELL_ORDER",
                "SOLD",
            ]);
        });
    });

    describe("RADAR_STATES", () => {
        it("is watching, shortlisted and trader bought", () => {
            expect(RADAR_STATES).toEqual([WATCHING, SHORTLISTED, TRADER_BOUGHT]);
        });
    });

    describe("transitionsFrom", () => {
        it.each(TRANSITION_CASES)("%s → %s allowed: %s", (from, to, allowed) => {
            expect(transitionsFrom(from).includes(to)).toBe(allowed);
        });
    });

    describe("fieldsOf", () => {
        it.each([
            [WATCHING, ["entryPrice"]],
            [SHORTLISTED, ["entryPrice"]],
            [TRADER_BOUGHT, ["entryPrice"]],
            [BUY_ORDER, ["entryPrice", "quantity"]],
            [INVESTED, ["entryPrice", "quantity", "buyCommission", "buyDate"]],
            [SELL_ORDER, ["entryPrice", "quantity", "buyCommission", "buyDate", "exitPrice"]],
            [
                SOLD,
                [
                    "entryPrice",
                    "quantity",
                    "buyCommission",
                    "buyDate",
                    "exitPrice",
                    "sellCommission",
                    "sellDate",
                ],
            ],
        ])("%s carries %j", (state, fields) => {
            expect(fieldsOf(state)).toEqual(fields);
        });
    });
});
