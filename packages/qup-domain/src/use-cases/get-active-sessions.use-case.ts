import { inject, injectable } from "inversify";
import { TOKENS } from "../tokens.ts";
import type { Session } from "../entities/session.ts";
import type { PersistenceError } from "../errors.ts";
import type { SessionRepository } from "../ports/session.repository.ts";
import type { ResultAsync } from "neverthrow";

@injectable()
export class GetActiveSessionsUseCase {
    constructor(
        @inject(TOKENS.SessionRepository) private readonly sessionRepo: SessionRepository,
    ) {}

    execute(): ResultAsync<Session[], PersistenceError> {
        return this.sessionRepo.findActive();
    }
}
