import type { Session } from "../entities/session.ts";
import type { PersistenceError } from "../errors.ts";
import type { SessionCode } from "../value-objects/session-code.ts";
import type { ResultAsync } from "neverthrow";

export interface SessionRepository {
    save(session: Session): ResultAsync<Session, PersistenceError>;
    findByCode(code: SessionCode): ResultAsync<Session | null, PersistenceError>;
    findById(id: string): ResultAsync<Session | null, PersistenceError>;
    findActive(): ResultAsync<Session[], PersistenceError>;
    updateStatus(session: Session): ResultAsync<void, PersistenceError>;
}
