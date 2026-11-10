import { useEffect, useId, type ReactNode, type FC } from "react";
import { useFetcher } from "react-router";
import {
    generalError,
    type EntryFieldInput,
    type EntryFieldValues,
    type RogerFieldErrors,
} from "#roger/view-model/roger.view-model";
import type { RogerActionResult } from "#roger/form/entry.form";
import type { EntryField } from "@m0n0lab/investlab-roger";

interface FieldErrorProps {
    message: string | undefined;
}

export const FieldError: FC<FieldErrorProps> = ({ message }) => {
    return message ? <span className="form-error">{message}</span> : null;
};

interface EntryFieldInputsProps {
    inputs: EntryFieldInput[];
    values: EntryFieldValues;
    errors: RogerFieldErrors;
    onChange: (field: EntryField, value: string) => void;
}

/** No `required` or `min`: the server's refusal is what shows inline, so the browser must let it through. */
export const EntryFieldInputs: FC<EntryFieldInputsProps> = ({
    inputs,
    values,
    errors,
    onChange,
}) => {
    return inputs.map(({ field, label, type }) => (
        <label key={field}>
            {label}
            <input
                type={type}
                name={field}
                value={values[field] ?? ""}
                step={type === "number" ? "any" : undefined}
                aria-invalid={errors[field] ? true : undefined}
                onChange={(e) => onChange(field, e.target.value)}
            />
            <FieldError message={errors[field]} />
        </label>
    ));
};

interface RogerFormShellProps {
    title: string;
    submitLabel: string;
    onDone: () => void;
    children: (errors: RogerFieldErrors) => ReactNode;
}

export const RogerFormShell: FC<RogerFormShellProps> = ({
    title,
    submitLabel,
    onDone,
    children,
}) => {
    const fetcher = useFetcher<RogerActionResult>();
    const titleId = useId();
    const result = fetcher.data;
    const failure = result && "error" in result ? result : undefined;
    const isSubmitting = fetcher.state !== "idle";
    const succeeded = fetcher.state === "idle" && result !== undefined && "ok" in result;
    const error = failure && generalError(failure.error, failure.fieldErrors);

    useEffect(() => {
        if (succeeded) onDone();
    }, [succeeded, onDone]);

    return (
        <fetcher.Form
            method="post"
            className="portfolio-form"
            aria-labelledby={titleId}
        >
            <h2
                id={titleId}
                className="roger-form-title"
            >
                {title}
            </h2>

            {children(failure?.fieldErrors ?? {})}

            {error ? <p className="form-error">{error}</p> : null}

            <div className="form-actions">
                <button
                    type="submit"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "Saving…" : submitLabel}
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
};
