import { useState } from "react";

export interface PortfolioItemView {
    id: string;
    instrumentId: string;
    broker: string;
    targetWeight: number;
    currentValue: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
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

export interface PortfolioViewModel {
    items: PortfolioItemView[];
    instruments: InstrumentOption[];
    editing: PortfolioItemView | undefined;
    formKey: string;
    isFormOpen: boolean;
    openCreate: () => void;
    openEdit: (item: PortfolioItemView) => void;
    closeForm: () => void;
}

export function usePortfolioViewModel(
    items: PortfolioItemView[],
    instruments: InstrumentOption[],
): PortfolioViewModel {
    const [editing, setEditing] = useState<PortfolioItemView | undefined>(undefined);
    const [isFormOpen, setIsFormOpen] = useState(false);

    return {
        items,
        instruments,
        editing,
        formKey: editing?.id ?? "new",
        isFormOpen,
        openCreate: () => {
            setEditing(undefined);
            setIsFormOpen(true);
        },
        openEdit: (item) => {
            setEditing(item);
            setIsFormOpen(true);
        },
        closeForm: () => {
            setEditing(undefined);
            setIsFormOpen(false);
        },
    };
}
