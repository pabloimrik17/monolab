import { inject, injectable } from "inversify";
import { type ResultAsync, errAsync, okAsync } from "neverthrow";

import type { Session } from "../entities/session.ts";
import type { InvalidCodeError, PersistenceError, SessionNotFoundError } from "../errors.ts";
import { SessionNotFoundError as SessionNotFoundErrorClass } from "../errors.ts";
import type { SessionRepository } from "../ports/session.repository.ts";
import { TOKENS } from "../tokens.ts";
import { SessionCode } from "../value-objects/session-code.ts";

@injectable()
export class GetSessionByCodeUseCase {
    constructor(
        @inject(TOKENS.SessionRepository) private readonly sessionRepo: SessionRepository,
    ) {}

    execute(
        rawCode: string,
    ): ResultAsync<Session, InvalidCodeError | SessionNotFoundError | PersistenceError> {
        const codeResult = SessionCode.from(rawCode);
        if (codeResult.isErr()) {
            return errAsync(codeResult.error);
        }

        return this.sessionRepo.findByCode(codeResult.value).andThen((session) => {
            if (!session) {
                return errAsync(new SessionNotFoundErrorClass(rawCode));
            }
            return okAsync(session);
        });
    }
}
