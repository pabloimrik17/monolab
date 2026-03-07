import { err, ok, type Result } from "neverthrow";

import { InvalidCodeError } from "../errors.ts";

const CODE_PATTERN = /^[A-Z0-9]{6}$/;
const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_LENGTH = 6;

export class SessionCode {
    private constructor(private readonly _value: string) {}

    get value(): string {
        return this._value;
    }

    static generate(): SessionCode {
        let code = "";
        for (let i = 0; i < CODE_LENGTH; i++) {
            code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
        }
        return new SessionCode(code);
    }

    static from(raw: string): Result<SessionCode, InvalidCodeError> {
        const normalized = raw.toUpperCase();
        if (!CODE_PATTERN.test(normalized)) {
            return err(new InvalidCodeError(raw));
        }
        return ok(new SessionCode(normalized));
    }

    equals(other: SessionCode): boolean {
        return this._value === other._value;
    }

    toString(): string {
        return this._value;
    }
}
