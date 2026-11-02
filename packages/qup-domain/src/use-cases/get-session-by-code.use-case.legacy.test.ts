import { Container } from "inversify";
import { okAsync } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import { domainModule } from "../domain.module.ts";
import { Session } from "../entities/session.ts";
import { TOKENS } from "../tokens.ts";
import type { SessionRepository } from "../ports/session.repository.ts";
import type { SessionCode } from "../value-objects/session-code.ts";
import type { GetSessionByCodeUseCase } from "./get-session-by-code.use-case.ts";

describe("GetSessionByCodeUseCase", () => {
    let sessions: Session[];
    let getByCode: GetSessionByCodeUseCase;

    beforeEach(() => {
        sessions = [];
        const container = new Container();
        container.load(domainModule);
        container.bind(TOKENS.SessionRepository).toConstantValue({
            findByCode: (code: SessionCode) =>
                okAsync(sessions.find((session) => session.code.value === code.value) ?? null),
        } satisfies Partial<SessionRepository>);
        getByCode = container.get<GetSessionByCodeUseCase>(TOKENS.GetSessionByCodeUseCase);
    });

    describe("joining by code", () => {
        it("finds the open session, whatever the case of the code typed", async () => {
            const session = Session.create({ name: "Coffee Run" })._unsafeUnwrap();
            sessions.push(session);

            const found = (
                await getByCode.execute(session.code.value.toLowerCase())
            )._unsafeUnwrap();

            expect(found).toBe(session);
        });

        it("refuses a malformed code", async () => {
            const error = (await getByCode.execute("bad!"))._unsafeUnwrapErr();

            expect(error.code).toBe("INVALID_CODE");
        });

        it("refuses a code no session has", async () => {
            const error = (await getByCode.execute("ABC123"))._unsafeUnwrapErr();

            expect(error.code).toBe("SESSION_NOT_FOUND");
        });

        it("refuses a closed session", async () => {
            const session = Session.create({ name: "Coffee Run" })._unsafeUnwrap();
            session.close();
            sessions.push(session);

            const error = (await getByCode.execute(session.code.value))._unsafeUnwrapErr();

            expect(error.code).toBe("SESSION_CLOSED");
        });
    });
});
