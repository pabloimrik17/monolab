// fallow-ignore-file code-duplication -- each route harness owns the givens of the use cases its routes call, shared ones included
import { errAsync, okAsync } from "neverthrow";
import { TOKENS } from "@m0n0lab/qup-domain";
import { ApiHarness, type EventStream, type UseCaseError } from "../harness/api.harness.ts";
import type { GetSessionByCodeUseCase, Session } from "@m0n0lab/qup-domain";

export class EventRouteHarness extends ApiHarness {
    givenSession(session: Session) {
        return this.fake<GetSessionByCodeUseCase>(TOKENS.GetSessionByCodeUseCase, okAsync(session));
    }

    givenSessionFails(error: UseCaseError<GetSessionByCodeUseCase>) {
        return this.fake<GetSessionByCodeUseCase>(TOKENS.GetSessionByCodeUseCase, errAsync(error));
    }

    /** What a use case publishes after a change, such as `order:status`. */
    publish(event: string, payload: unknown) {
        this.emit(event, payload);
    }

    /** Resolves once the stream is live; rejects when the route answers anything but a stream. */
    watchSession(code: string): Promise<EventStream> {
        return this.stream(`/events/sessions/${code}`);
    }

    /** The route's answer when it refuses to stream. */
    watchSessionRefused(code: string) {
        return this.reply<never>(this.request(`/events/sessions/${code}`));
    }
}
