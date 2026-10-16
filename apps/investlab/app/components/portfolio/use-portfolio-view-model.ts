import { useState } from "react";
import type { InstrumentOption, PortfolioItemView } from "./types";

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
