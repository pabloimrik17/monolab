import { err, ok, type Result } from "neverthrow";
import { ValidationError } from "../errors.ts";
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

    static create(props: {
        symbol: string;
        name: string;
        type: InstrumentType;
        assetClass: AssetClass;
        exchange?: string;
        sector?: Sector;
        replicates?: string;
        quotable?: boolean;
    }): Result<Instrument, ValidationError> {
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

    update(props: {
        name?: string;
        type?: InstrumentType;
        assetClass?: AssetClass;
        exchange?: string;
        sector?: Sector;
        replicates?: string;
        quotable?: boolean;
    }): Result<void, ValidationError> {
        if (props.name !== undefined && !props.name.trim()) {
            return err(new ValidationError("Instrument name cannot be empty"));
        }

        if (props.name !== undefined) {
            this._name = props.name.trim();
        }
        if (props.type !== undefined) {
            this._type = props.type;
        }
        if (props.assetClass !== undefined) {
            this._assetClass = props.assetClass;
        }
        if ("exchange" in props) {
            this._exchange = props.exchange;
        }
        if ("sector" in props) {
            this._sector = props.sector;
        }
        if ("replicates" in props) {
            this._replicates = props.replicates;
        }
        if (props.quotable !== undefined) {
            this._quotable = props.quotable;
        }

        return ok(undefined);
    }
}
