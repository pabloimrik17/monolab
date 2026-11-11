// fallow-ignore-file code-duplication -- each route harness owns the givens of the use cases its routes call, shared ones included
import { errAsync, okAsync } from "neverthrow";
import { TOKENS } from "@m0n0lab/qup-domain";
import { ApiHarness, type UseCaseError } from "../harness/api.harness.ts";
import type {
    CloseSessionUseCase,
    CreateSessionUseCase,
    GetActiveSessionsUseCase,
    GetSessionByCodeUseCase,
    GetSessionByIdUseCase,
    GetSessionOrdersUseCase,
    Order,
    Session,
} from "@m0n0lab/qup-domain";
import type { OrderDto, SessionDto } from "@m0n0lab/qup-shared";

export class SessionRouteHarness extends ApiHarness {
    givenSessionCreated(session: Session) {
        return this.fake<CreateSessionUseCase>(TOKENS.CreateSessionUseCase, okAsync(session));
    }

    givenCreateFails(error: UseCaseError<CreateSessionUseCase>) {
        return this.fake<CreateSessionUseCase>(TOKENS.CreateSessionUseCase, errAsync(error));
    }

    givenActiveSessions(sessions: Session[]) {
        return this.fake<GetActiveSessionsUseCase>(
            TOKENS.GetActiveSessionsUseCase,
            okAsync(sessions),
        );
    }

    givenActiveSessionsFail(error: UseCaseError<GetActiveSessionsUseCase>) {
        return this.fake<GetActiveSessionsUseCase>(
            TOKENS.GetActiveSessionsUseCase,
            errAsync(error),
        );
    }

    givenSessionByCode(session: Session) {
        return this.fake<GetSessionByCodeUseCase>(TOKENS.GetSessionByCodeUseCase, okAsync(session));
    }

    givenSessionByCodeFails(error: UseCaseError<GetSessionByCodeUseCase>) {
        return this.fake<GetSessionByCodeUseCase>(TOKENS.GetSessionByCodeUseCase, errAsync(error));
    }

    givenSessionById(session: Session) {
        return this.fake<GetSessionByIdUseCase>(TOKENS.GetSessionByIdUseCase, okAsync(session));
    }

    givenSessionByIdFails(error: UseCaseError<GetSessionByIdUseCase>) {
        return this.fake<GetSessionByIdUseCase>(TOKENS.GetSessionByIdUseCase, errAsync(error));
    }

    givenSessionByIdThrows(error: Error) {
        return this.fakeThrowing<GetSessionByIdUseCase>(TOKENS.GetSessionByIdUseCase, error);
    }

    givenSessionOrders(orders: Order[]) {
        return this.fake<GetSessionOrdersUseCase>(TOKENS.GetSessionOrdersUseCase, okAsync(orders));
    }

    givenSessionOrdersFail(error: UseCaseError<GetSessionOrdersUseCase>) {
        return this.fake<GetSessionOrdersUseCase>(TOKENS.GetSessionOrdersUseCase, errAsync(error));
    }

    givenCloseSucceeds() {
        return this.fake<CloseSessionUseCase>(TOKENS.CloseSessionUseCase, okAsync(undefined));
    }

    givenCloseFails(error: UseCaseError<CloseSessionUseCase>) {
        return this.fake<CloseSessionUseCase>(TOKENS.CloseSessionUseCase, errAsync(error));
    }

    createSession(body: unknown) {
        return this.reply<SessionDto>(this.adminJson("/sessions", "POST", body));
    }

    /** `query` is the raw search string, `?status=OPEN` or empty. */
    listSessions(query: string) {
        return this.reply<SessionDto[]>(this.request(`/sessions${query}`));
    }

    sessionByCode(code: string) {
        return this.reply<SessionDto>(this.request(`/sessions/code/${code}`));
    }

    sessionById(id: string) {
        return this.reply<SessionDto>(this.request(`/sessions/${id}`));
    }

    sessionOrders(id: string) {
        return this.reply<OrderDto[]>(this.request(`/sessions/${id}/orders`));
    }

    closeSession(id: string) {
        return this.reply<{ ok: boolean }>(
            this.admin(`/sessions/${id}/close`, { method: "PATCH" }),
        );
    }
}
