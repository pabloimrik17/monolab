import { Container } from "inversify";
import { okAsync } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import { domainModule } from "../domain.module.ts";
import { Session } from "../entities/session.ts";
import { TOKENS } from "../tokens.ts";
import { SessionStatus } from "../value-objects/session-status.ts";
import type { EventBus } from "../ports/event-bus.ts";
import type { SessionRepository } from "../ports/session.repository.ts";
import type { CloseSessionUseCase } from "./close-session.use-case.ts";

describe("CloseSessionUseCase", () => {
    let sessions: Session[];
    let updated: Session[];
    let events: unknown[][];
    let close: CloseSessionUseCase;

    beforeEach(() => {
        sessions = [];
        updated = [];
        events = [];
        const container = new Container();
        container.load(domainModule);
        container.bind(TOKENS.SessionRepository).toConstantValue({
            findById: (id: string) =>
                okAsync(sessions.find((session) => session.id === id) ?? null),
            updateStatus: (session: Session) => {
                updated.push(session);
                return okAsync(undefined);
            },
        } satisfies Partial<SessionRepository>);
        container.bind(TOKENS.EventBus).toConstantValue({
            emit: (...event: unknown[]) => events.push(event),
        } satisfies Partial<EventBus>);
        close = container.get<CloseSessionUseCase>(TOKENS.CloseSessionUseCase);
    });

    describe("closing a session", () => {
        it("stores it as closed and announces it", async () => {
            const session = Session.create({ name: "Coffee Run" })._unsafeUnwrap();
            sessions.push(session);

            const result = await close.execute(session.id);

            expect(result.isOk()).toBe(true);
            expect(updated).toEqual([session]);
            expect(session.status).toBe(SessionStatus.CLOSED);
            expect(events).toEqual([["session:closed", { sessionId: session.id }]]);
        });

        it("refuses an unknown session", async () => {
            const error = (await close.execute("unknown"))._unsafeUnwrapErr();

            expect(error.code).toBe("SESSION_NOT_FOUND");
        });

        it("refuses a session that is already closed, storing and announcing nothing", async () => {
            const session = Session.create({ name: "Coffee Run" })._unsafeUnwrap();
            session.close();
            sessions.push(session);

            const error = (await close.execute(session.id))._unsafeUnwrapErr();

            expect(error.code).toBe("SESSION_ALREADY_CLOSED");
            expect(updated).toEqual([]);
            expect(events).toEqual([]);
        });
    });
});
