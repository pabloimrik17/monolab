import { useId, useState } from "react";
import {
    EntryFieldInputs,
    FieldError,
    RogerFormShell,
} from "#roger/component/roger-form-shell.component";
import {
    chooseInstrument,
    DEFAULT_INITIAL_STATE,
    INITIAL_STATE_OPTIONS,
    inputsOf,
    newEntryInitialValues,
    SECTOR_OPTIONS,
    withNewEntryField,
    type InstrumentChoice,
    type InstrumentOption,
    type RogerFieldErrors,
} from "#roger/view-model/roger.view-model";
import type { RogerState } from "@m0n0lab/investlab-roger";

interface NewStockFieldsProps {
    symbol: string;
    errors: RogerFieldErrors;
}

function NewStockFields({ symbol, errors }: NewStockFieldsProps) {
    return (
        <>
            <p className="roger-form-note">
                {symbol} is not in the catalog. Add it as a new stock.
            </p>
            <label>
                Name
                <input
                    type="text"
                    name="name"
                    aria-invalid={errors.name ? true : undefined}
                />
                <FieldError message={errors.name} />
            </label>
            <label>
                Sector
                <select
                    name="sector"
                    aria-invalid={errors.sector ? true : undefined}
                >
                    <option value="">No sector</option>
                    {SECTOR_OPTIONS.map(({ value, label }) => (
                        <option
                            key={value}
                            value={value}
                        >
                            {label}
                        </option>
                    ))}
                </select>
                <FieldError message={errors.sector} />
            </label>
        </>
    );
}

interface InstrumentPickerProps {
    typed: string;
    choice: InstrumentChoice;
    instruments: InstrumentOption[];
    errors: RogerFieldErrors;
    onType: (typed: string) => void;
}

function InstrumentPicker({ typed, choice, instruments, errors, onType }: InstrumentPickerProps) {
    const listId = useId();
    const error = errors.instrumentId ?? errors.symbol;

    return (
        <>
            <label>
                Symbol
                <input
                    type="text"
                    list={listId}
                    autoComplete="off"
                    value={typed}
                    name={choice.kind === "new" ? "symbol" : undefined}
                    aria-invalid={error ? true : undefined}
                    onChange={(e) => onType(e.target.value)}
                />
                <FieldError message={error} />
            </label>
            <datalist id={listId}>
                {instruments.map(({ id, symbol, name }) => (
                    <option
                        key={id}
                        value={symbol}
                    >
                        {name}
                    </option>
                ))}
            </datalist>
            {choice.kind === "existing" ? (
                <>
                    <input
                        type="hidden"
                        name="instrumentId"
                        value={choice.instrument.id}
                    />
                    <p className="roger-form-note">{choice.instrument.name}</p>
                </>
            ) : null}
            {choice.kind === "new" ? (
                <NewStockFields
                    symbol={choice.symbol}
                    errors={errors}
                />
            ) : null}
        </>
    );
}

interface EntryFormProps {
    instruments: InstrumentOption[];
    onDone: () => void;
}

export function EntryForm({ instruments, onDone }: EntryFormProps): React.JSX.Element {
    const [typed, setTyped] = useState("");
    const [state, setState] = useState(DEFAULT_INITIAL_STATE);
    const [values, setValues] = useState(newEntryInitialValues);
    const choice = chooseInstrument(typed, instruments);

    return (
        <RogerFormShell
            title="New entry"
            submitLabel="Add entry"
            onDone={onDone}
        >
            {(errors) => (
                <>
                    <input
                        type="hidden"
                        name="intent"
                        value="create"
                    />
                    <InstrumentPicker
                        typed={typed}
                        choice={choice}
                        instruments={instruments}
                        errors={errors}
                        onType={setTyped}
                    />
                    <label>
                        Initial state
                        <select
                            name="state"
                            value={state}
                            onChange={(e) => setState(e.target.value as RogerState)}
                        >
                            {INITIAL_STATE_OPTIONS.map(({ value, label }) => (
                                <option
                                    key={value}
                                    value={value}
                                >
                                    {label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <EntryFieldInputs
                        inputs={inputsOf(state)}
                        values={values}
                        errors={errors}
                        onChange={(field, value) =>
                            setValues((current) => withNewEntryField(current, field, value))
                        }
                    />
                </>
            )}
        </RogerFormShell>
    );
}
