import { inject, injectable } from "inversify";
import { type ResultAsync, errAsync, okAsync } from "neverthrow";
import { Session } from "../entities/session.ts";
import { TOKENS } from "../tokens.ts";
import type { PersistenceError, ValidationError } from "../errors.ts";
import type { EventBus } from "../ports/event-bus.ts";
import type { SessionRepository } from "../ports/session.repository.ts";

@injectable()
export class CreateSessionUseCase {
    constructor(
        @inject(TOKENS.SessionRepository) private readonly sessionRepo: SessionRepository,
        @inject(TOKENS.EventBus) private readonly eventBus: EventBus,
    ) {}

    execute(props: { name: string }): ResultAsync<Session, ValidationError | PersistenceError> {
        const result = Session.create(props);
        if (result.isErr()) {
            return errAsync(result.error);
        }
        const session = result.value;
        return this.sessionRepo.save(session).map((saved) => {
            this.eventBus.emit("session:created", {
                sessionId: saved.id,
                code: saved.code.value,
            });
            return saved;
        });
    }
}
