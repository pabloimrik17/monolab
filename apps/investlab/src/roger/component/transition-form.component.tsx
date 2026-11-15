import { useState, type FC } from "react";
import { EntryFieldInputs, RogerFormShell } from "#roger/component/roger-form-shell.component";
import type { ExistingEntryFormView } from "#roger/view-model/roger.view-model";

interface TransitionFormProps {
    form: ExistingEntryFormView;
    onDone: () => void;
}

export const TransitionForm: FC<TransitionFormProps> = ({ form, onDone }) => {
    const [values, setValues] = useState(form.initialValues);

    return (
        <RogerFormShell
            title={form.title}
            submitLabel={form.submitLabel}
            onDone={onDone}
        >
            {(errors) => (
                <>
                    {Object.entries(form.hidden).map(([name, value]) => (
                        <input
                            key={name}
                            type="hidden"
                            name={name}
                            value={value}
                        />
                    ))}
                    <EntryFieldInputs
                        inputs={form.inputs}
                        values={values}
                        errors={errors}
                        onChange={(field, value) =>
                            setValues((current) => ({ ...current, [field]: value }))
                        }
                    />
                </>
            )}
        </RogerFormShell>
    );
};
