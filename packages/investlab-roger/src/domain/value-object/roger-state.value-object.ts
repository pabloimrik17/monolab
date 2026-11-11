export enum RogerState {
    Watching = "WATCHING",
    Shortlisted = "SHORTLISTED",
    TraderBought = "TRADER_BOUGHT",
    BuyOrder = "BUY_ORDER",
    Invested = "INVESTED",
    SellOrder = "SELL_ORDER",
    Sold = "SOLD",
}

export type EntryField =
    | "entryPrice"
    | "quantity"
    | "buyCommission"
    | "buyDate"
    | "exitPrice"
    | "sellCommission"
    | "sellDate";

export const RADAR_STATES: readonly RogerState[] = [
    RogerState.Watching,
    RogerState.Shortlisted,
    RogerState.TraderBought,
];

const TRANSITIONS: Record<RogerState, readonly RogerState[]> = {
    [RogerState.Watching]: [
        RogerState.Shortlisted,
        RogerState.TraderBought,
        RogerState.BuyOrder,
        RogerState.Invested,
    ],
    [RogerState.Shortlisted]: [
        RogerState.Watching,
        RogerState.TraderBought,
        RogerState.BuyOrder,
        RogerState.Invested,
    ],
    [RogerState.TraderBought]: [
        RogerState.Watching,
        RogerState.Shortlisted,
        RogerState.BuyOrder,
        RogerState.Invested,
    ],
    [RogerState.BuyOrder]: [...RADAR_STATES, RogerState.Invested],
    [RogerState.Invested]: [RogerState.SellOrder, RogerState.Sold],
    [RogerState.SellOrder]: [RogerState.Invested, RogerState.Sold],
    [RogerState.Sold]: [],
};

const RADAR_FIELDS: readonly EntryField[] = ["entryPrice"];
const BUY_ORDER_FIELDS: readonly EntryField[] = [...RADAR_FIELDS, "quantity"];
const INVESTED_FIELDS: readonly EntryField[] = [...BUY_ORDER_FIELDS, "buyCommission", "buyDate"];
const SELL_ORDER_FIELDS: readonly EntryField[] = [...INVESTED_FIELDS, "exitPrice"];
const SOLD_FIELDS: readonly EntryField[] = [...SELL_ORDER_FIELDS, "sellCommission", "sellDate"];

const FIELDS: Record<RogerState, readonly EntryField[]> = {
    [RogerState.Watching]: RADAR_FIELDS,
    [RogerState.Shortlisted]: RADAR_FIELDS,
    [RogerState.TraderBought]: RADAR_FIELDS,
    [RogerState.BuyOrder]: BUY_ORDER_FIELDS,
    [RogerState.Invested]: INVESTED_FIELDS,
    [RogerState.SellOrder]: SELL_ORDER_FIELDS,
    [RogerState.Sold]: SOLD_FIELDS,
};

export function transitionsFrom(state: RogerState): readonly RogerState[] {
    return TRANSITIONS[state];
}

export function fieldsOf(state: RogerState): readonly EntryField[] {
    return FIELDS[state];
}
