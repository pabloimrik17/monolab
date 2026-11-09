import { useState } from "react";
import { Sector } from "@m0n0lab/investlab-catalog";
import {
    fieldsOf,
    RogerState,
    transitionsFrom,
    type EntryField,
    type EntryListView,
} from "@m0n0lab/investlab-roger";

export interface EntryView {
    id: string;
    instrumentId: string;
    state: RogerState;
    entryPrice: number;
    quantity?: number | undefined;
    buyCommission?: number | undefined;
    buyDate?: string | undefined;
    exitPrice?: number | undefined;
    sellCommission?: number | undefined;
    sellDate?: string | undefined;
    stateSince: string;
    createdAt: string;
    updatedAt: string;
    instrument: {
        symbol: string;
        name: string;
        sector?: string | undefined;
    };
}

export interface InstrumentOption {
    id: string;
    symbol: string;
    name: string;
    type: string;
    assetClass: string;
}

export interface RogerPageData {
    view: EntryListView;
    entries: EntryView[];
    instruments: InstrumentOption[];
}

type RogerFormField = EntryField | "instrumentId" | "symbol" | "name" | "sector";

export type RogerFieldErrors = Partial<Record<RogerFormField, string>>;

export const STATE_LABELS: Record<RogerState, string> = {
    [RogerState.Watching]: "Watching",
    [RogerState.Shortlisted]: "Shortlisted",
    [RogerState.TraderBought]: "Trader bought",
    [RogerState.BuyOrder]: "Buy order",
    [RogerState.Invested]: "Invested",
    [RogerState.SellOrder]: "Sell order",
    [RogerState.Sold]: "Sold",
};

const FIELD_LABELS: Record<EntryField, string> = {
    entryPrice: "Entry price",
    quantity: "Quantity",
    buyCommission: "Buy commission",
    buyDate: "Buy date",
    exitPrice: "Exit price",
    sellCommission: "Sell commission",
    sellDate: "Sell date",
};

const STATE_ORDER = Object.values(RogerState);
const ACTIVE_STATES = STATE_ORDER.filter((state) => state !== RogerState.Sold);
// SOLD is the one state that carries every field.
const ALL_FIELDS = fieldsOf(RogerState.Sold);

export interface LabelledOption {
    value: string;
    label: string;
}

const statesAsOptions = (states: readonly RogerState[]): LabelledOption[] =>
    states.map((state) => ({ value: state, label: STATE_LABELS[state] }));

export const INITIAL_STATE_OPTIONS = statesAsOptions(STATE_ORDER);
export const STATE_FILTER_OPTIONS = statesAsOptions(ACTIVE_STATES);

const sectorLabel = (sector: string): string =>
    sector.charAt(0).toUpperCase() + sector.slice(1).replaceAll("_", " ");

export const SECTOR_OPTIONS: LabelledOption[] = Object.values(Sector).map((value) => ({
    value,
    label: sectorLabel(value),
}));

export type SortColumn = "state" | EntryField;
type SortDirection = "ascending" | "descending";

interface EntrySort {
    column: SortColumn;
    direction: SortDirection;
}

export interface EntryColumnView {
    column: SortColumn;
    label: string;
    sortable: boolean;
    sort: SortDirection | undefined;
}

interface EntryTransitionAction {
    to: RogerState;
    label: string;
}

export interface EntryRowView {
    entry: EntryView;
    cells: { field: EntryField; text: string }[];
    transitions: EntryTransitionAction[];
    canReEnter: boolean;
}

export interface EntrySectionView {
    key: string;
    heading?: { symbol: string; name: string; sector: string | undefined };
    rows: EntryRowView[];
}

function rowOf(entry: EntryView): EntryRowView {
    return {
        entry,
        cells: ALL_FIELDS.map((field) => ({ field, text: entry[field]?.toString() ?? "—" })),
        transitions: transitionsFrom(entry.state).map((to) => ({
            to,
            label: `Move to ${STATE_LABELS[to]}`,
        })),
        canReEnter: entry.state === RogerState.Sold,
    };
}

const sortValue = (entry: EntryView, column: SortColumn): number | string | undefined =>
    column === "state" ? STATE_ORDER.indexOf(entry.state) : entry[column];

function sortEntries(entries: EntryView[], sort: EntrySort | undefined): EntryView[] {
    if (!sort) return entries;
    const factor = sort.direction === "ascending" ? 1 : -1;
    return entries.toSorted((a, b) => {
        const left = sortValue(a, sort.column);
        const right = sortValue(b, sort.column);
        // An entry without the value goes last in both directions.
        if (left === undefined || right === undefined) {
            return Number(left === undefined) - Number(right === undefined);
        }
        if (left === right) return 0;
        return left < right ? -factor : factor;
    });
}

function groupedSections(
    entries: EntryView[],
    stateFilter: RogerState | undefined,
    sort: EntrySort | undefined,
): EntrySectionView[] {
    const matching = stateFilter ? entries.filter(({ state }) => state === stateFilter) : entries;
    return [...Map.groupBy(matching, ({ instrumentId }) => instrumentId)].map(
        ([instrumentId, group]) => {
            const { symbol, name, sector } = group[0].instrument;
            return {
                key: instrumentId,
                heading: {
                    symbol,
                    name,
                    sector: sector === undefined ? undefined : sectorLabel(sector),
                },
                rows: sortEntries(group, sort).map(rowOf),
            };
        },
    );
}

// The API already orders the history by sell date, across instruments, so it stays one flat list.
const historySections = (entries: EntryView[]): EntrySectionView[] =>
    entries.length > 0 ? [{ key: "history", rows: entries.map(rowOf) }] : [];

function columnsOf(view: EntryListView, sort: EntrySort | undefined): EntryColumnView[] {
    const stateColumn = { column: "state", label: "State" } as const;
    const fieldColumns = ALL_FIELDS.map((field) => ({
        column: field,
        label: FIELD_LABELS[field],
    }));
    return [stateColumn, ...fieldColumns].map(({ column, label }) => ({
        column,
        label,
        sortable: view === "active",
        sort: sort?.column === column ? sort.direction : undefined,
    }));
}

function emptyMessageOf(view: EntryListView, stateFilter: RogerState | undefined): string {
    if (view === "history") return "No sold entries yet.";
    return stateFilter ? `No entries in ${STATE_LABELS[stateFilter]}.` : "No active entries yet.";
}

type RogerFormTarget =
    | { kind: "create" }
    | { kind: "edit"; entry: EntryView }
    | { kind: "transition"; entry: EntryView; to: RogerState }
    | { kind: "re-enter"; entry: EntryView };

function formKeyOf(target: RogerFormTarget | undefined): string {
    if (!target) return "closed";
    if (target.kind === "create") return "create";
    return target.kind === "transition"
        ? `transition:${target.entry.id}:${target.to}`
        : `${target.kind}:${target.entry.id}`;
}

export interface EntryFieldInput {
    field: EntryField;
    label: string;
    type: "number" | "date";
}

export type EntryFieldValues = Partial<Record<EntryField, string>>;

const isDateField = (field: EntryField): boolean => field === "buyDate" || field === "sellDate";

export const inputsOf = (state: RogerState): EntryFieldInput[] =>
    fieldsOf(state).map((field) => ({
        field,
        label: FIELD_LABELS[field],
        type: isDateField(field) ? "date" : "number",
    }));

function localToday(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
}

function initialValue(field: EntryField, entry: EntryView | undefined, today: string): string {
    const existing = entry?.[field];
    if (existing !== undefined) return existing.toString();
    if (isDateField(field)) return today;
    return field === "sellCommission" ? (entry?.buyCommission?.toString() ?? "") : "";
}

function initialValues(state: RogerState, entry?: EntryView): EntryFieldValues {
    const today = localToday();
    return Object.fromEntries(
        fieldsOf(state).map((field) => [field, initialValue(field, entry, today)]),
    );
}

export interface ExistingEntryFormView {
    title: string;
    submitLabel: string;
    hidden: Record<string, string>;
    inputs: EntryFieldInput[];
    initialValues: EntryFieldValues;
}

type ExistingEntryTarget = Exclude<RogerFormTarget, { kind: "create" }>;

export function existingEntryForm(target: ExistingEntryTarget): ExistingEntryFormView {
    const { entry } = target;
    const { symbol } = entry.instrument;
    const known = { id: entry.id, state: entry.state };
    const ref = { ...known, expectedUpdatedAt: entry.updatedAt };
    const asking = (state: RogerState) => ({
        inputs: inputsOf(state),
        initialValues: initialValues(state, entry),
    });

    switch (target.kind) {
        case "edit":
            return {
                title: `Edit ${symbol} entry`,
                submitLabel: "Save changes",
                hidden: { intent: "update", ...ref },
                ...asking(entry.state),
            };
        case "transition":
            return {
                title: `Move ${symbol} to ${STATE_LABELS[target.to]}`,
                submitLabel: "Confirm",
                hidden: { intent: "transition", ...ref, to: target.to },
                ...asking(target.to),
            };
        case "re-enter":
            return {
                title: `Re-enter ${symbol}`,
                submitLabel: "Confirm",
                hidden: { intent: "re-enter", ...known },
                ...asking(RogerState.BuyOrder),
            };
    }
}

export const DEFAULT_INITIAL_STATE = RogerState.Watching;

/** Every field, so a value typed under one initial state survives switching to another. */
export const newEntryInitialValues = (): EntryFieldValues => initialValues(RogerState.Sold);

/** On a new entry the buy commission is typed in the same form, so the sell commission tracks it until they differ. */
export function withNewEntryField(
    values: EntryFieldValues,
    field: EntryField,
    value: string,
): EntryFieldValues {
    const sellFollows = field === "buyCommission" && values.sellCommission === values.buyCommission;
    return { ...values, [field]: value, ...(sellFollows && { sellCommission: value }) };
}

export type InstrumentChoice =
    | { kind: "none" }
    | { kind: "existing"; instrument: InstrumentOption }
    | { kind: "new"; symbol: string };

export function chooseInstrument(typed: string, instruments: InstrumentOption[]): InstrumentChoice {
    const symbol = typed.trim().toUpperCase();
    if (symbol === "") return { kind: "none" };
    const instrument = instruments.find((option) => option.symbol.toUpperCase() === symbol);
    return instrument ? { kind: "existing", instrument } : { kind: "new", symbol };
}

/** The API repeats a field's refusal as the general message; showing it once, by the field, is enough. */
export function generalError(
    error: string,
    fieldErrors: RogerFieldErrors | undefined,
): string | undefined {
    return Object.values(fieldErrors ?? {}).includes(error) ? undefined : error;
}

export interface RogerViewModel {
    view: EntryListView;
    instruments: InstrumentOption[];
    sections: EntrySectionView[];
    columns: EntryColumnView[];
    showSymbol: boolean;
    emptyMessage: string;
    showStateFilter: boolean;
    stateFilter: RogerState | undefined;
    selectStateFilter: (value: string) => void;
    toggleSort: (column: SortColumn) => void;
    form: RogerFormTarget | undefined;
    formKey: string;
    openCreate: () => void;
    openEdit: (entry: EntryView) => void;
    openTransition: (entry: EntryView, to: RogerState) => void;
    openReEnter: (entry: EntryView) => void;
    closeForm: () => void;
}

export function useRogerViewModel({ view, entries, instruments }: RogerPageData): RogerViewModel {
    const [form, setForm] = useState<RogerFormTarget | undefined>(undefined);
    const [stateFilter, setStateFilter] = useState<RogerState | undefined>(undefined);
    const [sort, setSort] = useState<EntrySort | undefined>(undefined);
    const isHistory = view === "history";

    return {
        view,
        instruments,
        sections: isHistory
            ? historySections(entries)
            : groupedSections(entries, stateFilter, sort),
        columns: columnsOf(view, sort),
        showSymbol: isHistory,
        emptyMessage: emptyMessageOf(view, stateFilter),
        showStateFilter: !isHistory,
        stateFilter,
        selectStateFilter: (value) =>
            setStateFilter(ACTIVE_STATES.find((state) => state === value)),
        toggleSort: (column) =>
            setSort((current) => ({
                column,
                direction:
                    current?.column === column && current.direction === "ascending"
                        ? "descending"
                        : "ascending",
            })),
        form,
        formKey: formKeyOf(form),
        openCreate: () => setForm({ kind: "create" }),
        openEdit: (entry) => setForm({ kind: "edit", entry }),
        openTransition: (entry, to) => setForm({ kind: "transition", entry, to }),
        openReEnter: (entry) => setForm({ kind: "re-enter", entry }),
        closeForm: () => setForm(undefined),
    };
}
