import { eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { ResultAsync } from "neverthrow";
import {
    PersistenceError,
    SessionStatus,
    type Session,
    type SessionCode,
} from "@m0n0lab/qup-domain";
import { sessionToDomain, sessionToRow } from "../mappers/session.mapper.ts";
import { sessions } from "../schema/sessions.ts";
import { DATA_TOKENS } from "../tokens.ts";
import type { SessionRepository } from "@m0n0lab/qup-domain";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

@injectable()
export class PgSessionRepository implements SessionRepository {
    constructor(@inject(DATA_TOKENS.DrizzleDb) private readonly db: NodePgDatabase) {}

    save(session: Session): ResultAsync<Session, PersistenceError> {
        return ResultAsync.fromPromise(
            this.db.insert(sessions).values(sessionToRow(session)).returning(),
            (e) => new PersistenceError(e),
        ).map((rows) => sessionToDomain(rows[0]!));
    }

    findByCode(code: SessionCode): ResultAsync<Session | null, PersistenceError> {
        return ResultAsync.fromPromise(
            this.db.select().from(sessions).where(eq(sessions.code, code.value)),
            (e) => new PersistenceError(e),
        ).map((rows) => (rows.length > 0 ? sessionToDomain(rows[0]!) : null));
    }

    findActive(): ResultAsync<Session[], PersistenceError> {
        return ResultAsync.fromPromise(
            this.db.select().from(sessions).where(eq(sessions.status, SessionStatus.OPEN)),
            (e) => new PersistenceError(e),
        ).map((rows) => rows.map(sessionToDomain));
    }

    findById(id: string): ResultAsync<Session | null, PersistenceError> {
        return ResultAsync.fromPromise(
            this.db.select().from(sessions).where(eq(sessions.id, id)),
            (e) => new PersistenceError(e),
        ).map((rows) => (rows.length > 0 ? sessionToDomain(rows[0]!) : null));
    }

    updateStatus(session: Session): ResultAsync<void, PersistenceError> {
        return ResultAsync.fromPromise(
            (async () => {
                const updated = await this.db
                    .update(sessions)
                    .set({ status: session.status, closedAt: session.closedAt ?? null })
                    .where(eq(sessions.id, session.id))
                    .returning({ id: sessions.id });
                if (updated.length === 0) {
                    throw new Error(`Session ${session.id} not found`);
                }
            })(),
            (e) => new PersistenceError(e),
        );
    }
}
