import { inject, injectable } from "inversify";
import { errAsync, okAsync, type ResultAsync } from "neverthrow";
import { SessionNotFoundError as SessionNotFoundErrorClass } from "../errors.ts";
import { TOKENS } from "../tokens.ts";
import type { Session } from "../entities/session.ts";
import type { PersistenceError, SessionNotFoundError } from "../errors.ts";
import type { SessionRepository } from "../ports/session.repository.ts";

@injectable()
export class GetSessionByIdUseCase {
    constructor(
        @inject(TOKENS.SessionRepository) private readonly sessionRepo: SessionRepository,
    ) {}

    execute(id: string): ResultAsync<Session, SessionNotFoundError | PersistenceError> {
        return this.sessionRepo.findById(id).andThen((session) => {
            if (!session) {
                return errAsync(new SessionNotFoundErrorClass(id));
            }
            return okAsync(session);
        });
    }
}
