import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import type {
    InstrumentOption,
    PortfolioFieldErrors,
    PortfolioFormField,
    PortfolioItemView,
} from "./types";

interface PortfolioItemFormProps {
    instruments: InstrumentOption[];
    editing?: PortfolioItemView | undefined;
    onDone: () => void;
}

type FormValues = Record<PortfolioFormField, string>;

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

function fieldErrorsFrom(data: unknown): PortfolioFieldErrors {
    return hasKey(data, "fieldErrors") && typeof data.fieldErrors === "object" && data.fieldErrors
        ? (data.fieldErrors as PortfolioFieldErrors)
        : {};
}

function FieldError({ message }: { message: string | undefined }) {
    return message ? <span className="form-error">{message}</span> : null;
}

function submitLabel(isSubmitting: boolean, isEditing: boolean): string {
    if (isSubmitting) return "Saving…";
    return isEditing ? "Save changes" : "Add item";
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
                <>
                    <input
                        type="hidden"
                        name="id"
                        value={editing.id}
                    />
                    <input
                        type="hidden"
                        name="expectedUpdatedAt"
                        value={editing.updatedAt}
                    />
                </>
            ) : null}
        </>
    );
}

export function PortfolioItemForm({ instruments, editing, onDone }: PortfolioItemFormProps) {
    const fetcher = useFetcher();
    const [values, setValues] = useState<FormValues>(() =>
        editing ? valuesFrom(editing) : EMPTY_VALUES,
    );
    const fieldErrors = fieldErrorsFrom(fetcher.data);
    const bind = (field: PortfolioFormField) => ({
        name: field,
        value: values[field],
        "aria-invalid": fieldErrors[field] ? true : undefined,
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
                <FieldError message={fieldErrors.instrumentId} />
            </label>

            <label>
                Broker
                <input
                    type="text"
                    {...bind("broker")}
                    required
                    maxLength={100}
                />
                <FieldError message={fieldErrors.broker} />
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
                <FieldError message={fieldErrors.targetWeight} />
            </label>

            <label>
                Current value (€)
                <input
                    type="number"
                    {...bind("currentValue")}
                    min={0}
                    max={9_999_999_999.99}
                    step={0.01}
                />
                <FieldError message={fieldErrors.currentValue} />
            </label>

            <label>
                Notes
                <textarea
                    {...bind("notes")}
                    rows={3}
                />
                <FieldError message={fieldErrors.notes} />
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
