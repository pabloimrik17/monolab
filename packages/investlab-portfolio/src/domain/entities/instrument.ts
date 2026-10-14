import { err, ok, type Result } from "neverthrow";
import { ValidationError } from "@m0n0lab/investlab-core";
import type { AssetClass } from "../value-objects/asset-class.ts";
import type { InstrumentType } from "../value-objects/instrument-type.ts";
import type { Sector } from "../value-objects/sector.ts";

export interface InstrumentProps {
    id: string;
    symbol: string;
    name: string;
    type: InstrumentType;
    assetClass: AssetClass;
    exchange?: string | undefined;
    sector?: Sector | undefined;
    replicates?: string | undefined;
    quotable: boolean;
}

/** What a new instrument needs; `quotable` defaults to true. */
export interface InstrumentDraft {
    symbol: string;
    name: string;
    type: InstrumentType;
    assetClass: AssetClass;
    exchange?: string | undefined;
    sector?: Sector | undefined;
    replicates?: string | undefined;
    quotable?: boolean | undefined;
}

/** `undefined` or an omitted key leaves a field unchanged, except the optional fields below. */
export interface InstrumentChanges {
    symbol?: string | undefined;
    name?: string | undefined;
    type?: InstrumentType | undefined;
    assetClass?: AssetClass | undefined;
    /** Explicitly `undefined` clears the field; omit the key to keep it. */
    exchange?: string | undefined;
    sector?: Sector | undefined;
    replicates?: string | undefined;
    quotable?: boolean | undefined;
}

export class Instrument {
    readonly id: string;
    private _symbol: string;
    private _name: string;
    private _type: InstrumentType;
    private _assetClass: AssetClass;
    private _exchange?: string | undefined;
    private _sector?: Sector | undefined;
    private _replicates?: string | undefined;
    private _quotable: boolean;

    private constructor(props: InstrumentProps) {
        this.id = props.id;
        this._symbol = props.symbol;
        this._name = props.name;
        this._type = props.type;
        this._assetClass = props.assetClass;
        if (props.exchange != null) {
            this._exchange = props.exchange;
        }
        if (props.sector != null) {
            this._sector = props.sector;
        }
        if (props.replicates != null) {
            this._replicates = props.replicates;
        }
        this._quotable = props.quotable;
    }

    get symbol(): string {
        return this._symbol;
    }
    get name(): string {
        return this._name;
    }
    get type(): InstrumentType {
        return this._type;
    }
    get assetClass(): AssetClass {
        return this._assetClass;
    }
    get exchange(): string | undefined {
        return this._exchange;
    }
    get sector(): Sector | undefined {
        return this._sector;
    }
    get replicates(): string | undefined {
        return this._replicates;
    }
    get quotable(): boolean {
        return this._quotable;
    }

    static create(props: InstrumentDraft): Result<Instrument, ValidationError> {
        const symbol = props.symbol.trim().toUpperCase();
        if (!symbol) {
            return err(new ValidationError("Instrument symbol cannot be empty"));
        }
        const name = props.name.trim();
        if (!name) {
            return err(new ValidationError("Instrument name cannot be empty"));
        }

        return ok(
            new Instrument({
                id: crypto.randomUUID(),
                symbol,
                name,
                type: props.type,
                assetClass: props.assetClass,
                ...(props.exchange != null && { exchange: props.exchange }),
                ...(props.sector != null && { sector: props.sector }),
                ...(props.replicates != null && { replicates: props.replicates }),
                quotable: props.quotable ?? true,
            }),
        );
    }

    static reconstitute(props: InstrumentProps): Instrument {
        return new Instrument(props);
    }

    // fallow-ignore-next-line unused-class-member complexity -- the update use cases call it on the entity `findById` resolves, which fallow cannot type; one guard per field, each unit-tested
    update(changes: InstrumentChanges): Result<void, ValidationError> {
        const symbol = changes.symbol?.trim().toUpperCase();
        if (symbol === "") {
            return err(new ValidationError("Instrument symbol cannot be empty"));
        }
        const name = changes.name?.trim();
        if (name === "") {
            return err(new ValidationError("Instrument name cannot be empty"));
        }

        this._symbol = symbol ?? this._symbol;
        this._name = name ?? this._name;
        this._type = changes.type ?? this._type;
        this._assetClass = changes.assetClass ?? this._assetClass;
        this._quotable = changes.quotable ?? this._quotable;
        if ("exchange" in changes) {
            this._exchange = changes.exchange;
        }
        if ("sector" in changes) {
            this._sector = changes.sector;
        }
        if ("replicates" in changes) {
            this._replicates = changes.replicates;
        }
        return ok(undefined);
    }
}
