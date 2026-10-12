import { err, ok, type Result } from "neverthrow";
import { ValidationError } from "../errors.ts";

export interface PortfolioItemProps {
    id: string;
    instrumentId: string;
    broker: string;
    targetWeight: number;
    currentValue: number;
    notes?: string | undefined;
    createdAt: Date;
    updatedAt: Date;
}

export interface PortfolioItemChanges {
    broker?: string;
    targetWeight?: number;
    currentValue?: number;
    notes?: string;
}

const CHANGE_RULES: ReadonlyArray<readonly [(props: PortfolioItemChanges) => boolean, string]> = [
    [
        (props) => props.broker !== undefined && !props.broker.trim(),
        "PortfolioItem broker cannot be empty",
    ],
    [
        (props) =>
            props.targetWeight !== undefined &&
            !(
                Number.isFinite(props.targetWeight) &&
                props.targetWeight >= 0 &&
                props.targetWeight <= 100
            ),
        "PortfolioItem targetWeight must be a number between 0 and 100",
    ],
    [
        (props) =>
            props.currentValue !== undefined &&
            !(Number.isFinite(props.currentValue) && props.currentValue >= 0),
        "PortfolioItem currentValue must be a non-negative number",
    ],
];

function validateChanges(props: PortfolioItemChanges): Result<void, ValidationError> {
    const broken = CHANGE_RULES.find(([isInvalid]) => isInvalid(props));
    return broken ? err(new ValidationError(broken[1])) : ok(undefined);
}

export class PortfolioItem {
    readonly id: string;
    readonly instrumentId: string;
    private _broker: string;
    private _targetWeight: number;
    private _currentValue: number;
    private _notes?: string | undefined;
    readonly createdAt: Date;
    private _updatedAt: Date;

    private constructor(props: PortfolioItemProps) {
        this.id = props.id;
        this.instrumentId = props.instrumentId;
        this._broker = props.broker;
        this._targetWeight = props.targetWeight;
        this._currentValue = props.currentValue;
        if (props.notes != null) {
            this._notes = props.notes;
        }
        this.createdAt = props.createdAt;
        this._updatedAt = props.updatedAt;
    }

    get broker(): string {
        return this._broker;
    }
    get targetWeight(): number {
        return this._targetWeight;
    }
    get currentValue(): number {
        return this._currentValue;
    }
    get notes(): string | undefined {
        return this._notes;
    }
    get updatedAt(): Date {
        return this._updatedAt;
    }

    static create(props: {
        instrumentId: string;
        broker: string;
        targetWeight: number;
        currentValue?: number;
        notes?: string;
    }): Result<PortfolioItem, ValidationError> {
        const instrumentId = props.instrumentId.trim();
        if (!instrumentId) {
            return err(new ValidationError("PortfolioItem instrumentId cannot be empty"));
        }
        const broker = props.broker.trim();
        const currentValue = props.currentValue ?? 0;
        const now = new Date();
        return validateChanges({ broker, targetWeight: props.targetWeight, currentValue }).map(
            () =>
                new PortfolioItem({
                    id: crypto.randomUUID(),
                    instrumentId,
                    broker,
                    targetWeight: props.targetWeight,
                    currentValue,
                    ...(props.notes != null && { notes: props.notes }),
                    createdAt: now,
                    updatedAt: now,
                }),
        );
    }

    static reconstitute(props: PortfolioItemProps): PortfolioItem {
        return new PortfolioItem(props);
    }

    update(props: PortfolioItemChanges): Result<void, ValidationError> {
        return validateChanges(props).map(() => this.applyChanges(props));
    }

    private applyChanges(props: PortfolioItemChanges): void {
        if (props.broker !== undefined) {
            this._broker = props.broker.trim();
        }
        if (props.targetWeight !== undefined) {
            this._targetWeight = props.targetWeight;
        }
        if (props.currentValue !== undefined) {
            this._currentValue = props.currentValue;
        }
        if ("notes" in props) {
            this._notes = props.notes;
        }
        this._updatedAt = new Date();
    }
}
