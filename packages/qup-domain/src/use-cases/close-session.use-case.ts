import { inject, injectable } from "inversify";
import { type ResultAsync, errAsync } from "neverthrow";
import { SessionNotFoundError as SessionNotFoundErrorClass } from "../errors.ts";
import { TOKENS } from "../tokens.ts";
import type {
    PersistenceError,
    SessionAlreadyClosedError,
    SessionNotFoundError,
} from "../errors.ts";
import type { EventBus } from "../ports/event-bus.ts";
import type { SessionRepository } from "../ports/session.repository.ts";

@injectable()
export class CloseSessionUseCase {
    constructor(
        @inject(TOKENS.SessionRepository) private readonly sessionRepo: SessionRepository,
        @inject(TOKENS.EventBus) private readonly eventBus: EventBus,
    ) {}

    execute(
        sessionId: string,
    ): ResultAsync<void, SessionNotFoundError | SessionAlreadyClosedError | PersistenceError> {
        return this.sessionRepo.findById(sessionId).andThen((session) => {
            if (!session) {
                return errAsync(new SessionNotFoundErrorClass(sessionId));
            }

            const closeResult = session.close();
            if (closeResult.isErr()) {
                return errAsync(closeResult.error);
            }

            return this.sessionRepo.updateStatus(session).map(() => {
                this.eventBus.emit("session:closed", { sessionId: session.id });
            });
        });
    }
}
