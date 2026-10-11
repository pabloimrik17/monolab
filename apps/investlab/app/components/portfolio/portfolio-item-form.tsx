import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import type { InstrumentOption, PortfolioItemView } from "./types";

interface PortfolioItemFormProps {
    instruments: InstrumentOption[];
    editing?: PortfolioItemView | undefined;
    onDone: () => void;
}

type FormField = "instrumentId" | "broker" | "targetWeight" | "currentValue" | "notes";
type FormValues = Record<FormField, string>;

const EMPTY_VALUES: FormValues = {
    instrumentId: "",
    broker: "",
    targetWeight: "0",
    currentValue: "0",
    notes: "",
};

function valuesFrom(item: PortfolioItemView): FormValues {
    return {
        instrumentId: item.instrumentId,
        broker: item.broker,
        targetWeight: item.targetWeight.toString(),
        currentValue: item.currentValue.toString(),
        notes: item.notes ?? "",
    };
}

function hasKey<K extends string>(data: unknown, key: K): data is Record<K, unknown> {
    return typeof data === "object" && data !== null && key in data;
}

function submitLabel(isSubmitting: boolean, isEditing: boolean): string {
    if (isSubmitting) return "Saving…";
    return isEditing ? "Save changes" : "Add holding";
}

function IntentFields({ editing }: { editing: PortfolioItemView | undefined }) {
    return (
        <>
            <input
                type="hidden"
                name="intent"
                value={editing ? "update" : "create"}
            />
            {editing ? (
                <input
                    type="hidden"
                    name="id"
                    value={editing.id}
                />
            ) : null}
        </>
    );
}

export function PortfolioItemForm({ instruments, editing, onDone }: PortfolioItemFormProps) {
    const fetcher = useFetcher();
    const [values, setValues] = useState<FormValues>(() =>
        editing ? valuesFrom(editing) : EMPTY_VALUES,
    );
    const bind = (field: FormField) => ({
        name: field,
        value: values[field],
        onChange: (e: { target: { value: string } }) =>
            setValues((current) => ({ ...current, [field]: e.target.value })),
    });

    const isSubmitting = fetcher.state !== "idle";
    const succeeded = fetcher.state === "idle" && hasKey(fetcher.data, "ok");
    const error = hasKey(fetcher.data, "error") ? String(fetcher.data.error) : null;

    useEffect(() => {
        if (succeeded) onDone();
    }, [succeeded, onDone]);

    return (
        <fetcher.Form
            method="post"
            className="portfolio-form"
        >
            <IntentFields editing={editing} />

            <label>
                Instrument
                <select
                    {...bind("instrumentId")}
                    required
                    disabled={Boolean(editing)}
                >
                    <option value="">Select an instrument…</option>
                    {instruments.map((i) => (
                        <option
                            key={i.id}
                            value={i.id}
                        >
                            {i.name} ({i.symbol})
                        </option>
                    ))}
                </select>
            </label>

            <label>
                Broker
                <input
                    type="text"
                    {...bind("broker")}
                    required
                    maxLength={100}
                />
            </label>

            <label>
                Target weight (%)
                <input
                    type="number"
                    {...bind("targetWeight")}
                    min={0}
                    max={100}
                    step={0.01}
                    required
                />
            </label>

            <label>
                Current value (€)
                <input
                    type="number"
                    {...bind("currentValue")}
                    min={0}
                    step={0.01}
                />
            </label>

            <label>
                Notes
                <textarea
                    {...bind("notes")}
                    rows={3}
                />
            </label>

            {error ? <p className="form-error">{error}</p> : null}

            <div className="form-actions">
                <button
                    type="submit"
                    disabled={isSubmitting}
                >
                    {submitLabel(isSubmitting, Boolean(editing))}
                </button>
                <button
                    type="button"
                    onClick={onDone}
                >
                    Cancel
                </button>
            </div>
        </fetcher.Form>
    );
}
