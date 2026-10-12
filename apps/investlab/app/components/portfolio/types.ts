export interface PortfolioItemView {
    id: string;
    instrumentId: string;
    broker: string;
    targetWeight: number;
    currentValue: number;
    notes?: string;
    createdAt: string;
    instrument: {
        id: string;
        symbol: string;
        name: string;
        type: string;
        assetClass: string;
        replicates?: string;
    };
}

export interface InstrumentOption {
    id: string;
    symbol: string;
    name: string;
    type: string;
    assetClass: string;
}

export type PortfolioFormField =
    | "instrumentId"
    | "broker"
    | "targetWeight"
    | "currentValue"
    | "notes";

export type PortfolioFieldErrors = Partial<Record<PortfolioFormField, string>>;
