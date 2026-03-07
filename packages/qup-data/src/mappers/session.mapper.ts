import { Session, SessionCode, SessionStatus } from "@m0n0lab/qup-domain";

import type { sessions } from "../schema/sessions.ts";

type SessionRow = typeof sessions.$inferSelect;
type SessionInsert = typeof sessions.$inferInsert;

export function sessionToDomain(row: SessionRow): Session {
    return Session.reconstitute({
        id: row.id,
        name: row.name,
        code: SessionCode.from(row.code)._unsafeUnwrap(),
        status: row.status as SessionStatus,
        createdAt: row.createdAt,
        closedAt: row.closedAt ?? undefined,
    });
}

export function sessionToRow(session: Session): SessionInsert {
    return {
        id: session.id,
        name: session.name,
        code: session.code.value,
        status: session.status,
        createdAt: session.createdAt,
        closedAt: session.closedAt ?? null,
    };
}
