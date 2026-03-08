import { err, ok, type Result } from "neverthrow";
import { SessionAlreadyClosedError, ValidationError } from "../errors.ts";
import { SessionCode } from "../value-objects/session-code.ts";
import { SessionStatus } from "../value-objects/session-status.ts";

export interface SessionProps {
    id: string;
    name: string;
    code: SessionCode;
    status: SessionStatus;
    createdAt: Date;
    closedAt?: Date;
}

export class Session {
    readonly id: string;
    readonly name: string;
    readonly code: SessionCode;
    private _status: SessionStatus;
    readonly createdAt: Date;
    private _closedAt?: Date;

    private constructor(props: SessionProps) {
        this.id = props.id;
        this.name = props.name;
        this.code = props.code;
        this._status = props.status;
        this.createdAt = props.createdAt;
        this._closedAt = props.closedAt;
    }

    get status(): SessionStatus {
        return this._status;
    }

    get closedAt(): Date | undefined {
        return this._closedAt;
    }

    static create(props: { name: string }): Result<Session, ValidationError> {
        if (!props.name.trim()) {
            return err(new ValidationError("Session name cannot be empty"));
        }

        const session = new Session({
            id: crypto.randomUUID(),
            name: props.name.trim(),
            code: SessionCode.generate(),
            status: SessionStatus.OPEN,
            createdAt: new Date(),
        });

        return ok(session);
    }

    static reconstitute(props: SessionProps): Session {
        return new Session(props);
    }

    close(): Result<void, SessionAlreadyClosedError> {
        if (this._status === SessionStatus.CLOSED) {
            return err(new SessionAlreadyClosedError(this.id));
        }

        this._status = SessionStatus.CLOSED;
        this._closedAt = new Date();
        return ok(undefined);
    }

    isOpen(): boolean {
        return this._status === SessionStatus.OPEN;
    }
}
