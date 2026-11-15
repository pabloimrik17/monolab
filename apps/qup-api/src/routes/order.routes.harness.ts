// fallow-ignore-file code-duplication -- each route harness owns the givens of the use cases its routes call, shared ones included
import { errAsync, okAsync } from "neverthrow";
import { TOKENS } from "@m0n0lab/qup-domain";
import { ApiHarness, type UseCaseError } from "../harness/api.harness.ts";
import type {
    CancelOrderUseCase,
    CreateOrderUseCase,
    GetSessionByCodeUseCase,
    Order,
    Session,
    UpdateOrderStatusUseCase,
} from "@m0n0lab/qup-domain";
import type { OrderDto } from "@m0n0lab/qup-shared";

export class OrderRouteHarness extends ApiHarness {
    givenSession(session: Session) {
        return this.fake<GetSessionByCodeUseCase>(TOKENS.GetSessionByCodeUseCase, okAsync(session));
    }

    givenSessionFails(error: UseCaseError<GetSessionByCodeUseCase>) {
        return this.fake<GetSessionByCodeUseCase>(TOKENS.GetSessionByCodeUseCase, errAsync(error));
    }

    givenOrderCreated(order: Order) {
        return this.fake<CreateOrderUseCase>(TOKENS.CreateOrderUseCase, okAsync(order));
    }

    givenCreateFails(error: UseCaseError<CreateOrderUseCase>) {
        return this.fake<CreateOrderUseCase>(TOKENS.CreateOrderUseCase, errAsync(error));
    }

    givenStatusUpdated() {
        return this.fake<UpdateOrderStatusUseCase>(
            TOKENS.UpdateOrderStatusUseCase,
            okAsync(undefined),
        );
    }

    givenStatusUpdateFails(error: UseCaseError<UpdateOrderStatusUseCase>) {
        return this.fake<UpdateOrderStatusUseCase>(
            TOKENS.UpdateOrderStatusUseCase,
            errAsync(error),
        );
    }

    givenCancelSucceeds() {
        return this.fake<CancelOrderUseCase>(TOKENS.CancelOrderUseCase, okAsync(undefined));
    }

    givenCancelFails(error: UseCaseError<CancelOrderUseCase>) {
        return this.fake<CancelOrderUseCase>(TOKENS.CancelOrderUseCase, errAsync(error));
    }

    createOrder(body: unknown) {
        return this.reply<OrderDto>(this.json("/orders", "POST", body));
    }

    updateStatus(id: string, body: unknown) {
        return this.reply<{ ok: boolean }>(this.adminJson(`/orders/${id}/status`, "PATCH", body));
    }

    cancelOrder(id: string) {
        return this.reply<{ ok: boolean }>(this.admin(`/orders/${id}`, { method: "DELETE" }));
    }
}
