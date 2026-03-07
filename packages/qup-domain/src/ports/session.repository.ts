import type { ResultAsync } from "neverthrow";

import type { Session } from "../entities/session.ts";
import type { PersistenceError } from "../errors.ts";
import type { SessionCode } from "../value-objects/session-code.ts";

export interface SessionRepository {
    save(session: Session): ResultAsync<Session, PersistenceError>;
    findByCode(code: SessionCode): ResultAsync<Session | null, PersistenceError>;
    findById(id: string): ResultAsync<Session | null, PersistenceError>;
    updateStatus(session: Session): ResultAsync<void, PersistenceError>;
}
