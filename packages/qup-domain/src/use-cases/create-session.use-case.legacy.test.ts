import { Container } from "inversify";
import { okAsync } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import { domainModule } from "../domain.module.ts";
import { TOKENS } from "../tokens.ts";
import { SessionStatus } from "../value-objects/session-status.ts";
import type { Session } from "../entities/session.ts";
import type { EventBus } from "../ports/event-bus.ts";
import type { SessionRepository } from "../ports/session.repository.ts";
import type { CreateSessionUseCase } from "./create-session.use-case.ts";

describe("CreateSessionUseCase", () => {
    let saved: Session[];
    let events: unknown[][];
    let create: CreateSessionUseCase;

    beforeEach(() => {
        saved = [];
        events = [];
        const container = new Container();
        container.load(domainModule);
        container.bind(TOKENS.SessionRepository).toConstantValue({
            save: (session: Session) => {
                saved.push(session);
                return okAsync(session);
            },
        } satisfies Partial<SessionRepository>);
        container.bind(TOKENS.EventBus).toConstantValue({
            emit: (...event: unknown[]) => events.push(event),
        } satisfies Partial<EventBus>);
        create = container.get<CreateSessionUseCase>(TOKENS.CreateSessionUseCase);
    });

    describe("opening a session", () => {
        it("stores an open session with a join code and announces it", async () => {
            const session = (await create.execute({ name: "Coffee Run" }))._unsafeUnwrap();

            expect(session.name).toBe("Coffee Run");
            expect(session.status).toBe(SessionStatus.OPEN);
            expect(saved).toEqual([session]);
            expect(events).toEqual([
                ["session:created", { sessionId: session.id, code: session.code.value }],
            ]);
        });

        it("refuses an empty name, storing and announcing nothing", async () => {
            const error = (await create.execute({ name: "" }))._unsafeUnwrapErr();

            expect(error.code).toBe("VALIDATION_ERROR");
            expect(saved).toEqual([]);
            expect(events).toEqual([]);
        });
    });
});
