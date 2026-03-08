import { ContainerModule } from "inversify";
import { TOKENS } from "./tokens.ts";
import { CancelOrderUseCase } from "./use-cases/cancel-order.use-case.ts";
import { CloseSessionUseCase } from "./use-cases/close-session.use-case.ts";
import { CreateMenuItemUseCase } from "./use-cases/create-menu-item.use-case.ts";
import { CreateOrderUseCase } from "./use-cases/create-order.use-case.ts";
import { CreateSessionUseCase } from "./use-cases/create-session.use-case.ts";
import { DeleteMenuItemUseCase } from "./use-cases/delete-menu-item.use-case.ts";
import { GetMenuUseCase } from "./use-cases/get-menu.use-case.ts";
import { GetSessionByCodeUseCase } from "./use-cases/get-session-by-code.use-case.ts";
import { GetSessionOrdersUseCase } from "./use-cases/get-session-orders.use-case.ts";
import { UpdateMenuItemUseCase } from "./use-cases/update-menu-item.use-case.ts";
import { UpdateOrderStatusUseCase } from "./use-cases/update-order-status.use-case.ts";

export const domainModule = new ContainerModule((bind) => {
    bind(TOKENS.CreateSessionUseCase).to(CreateSessionUseCase);
    bind(TOKENS.CloseSessionUseCase).to(CloseSessionUseCase);
    bind(TOKENS.GetSessionByCodeUseCase).to(GetSessionByCodeUseCase);
    bind(TOKENS.CreateOrderUseCase).to(CreateOrderUseCase);
    bind(TOKENS.UpdateOrderStatusUseCase).to(UpdateOrderStatusUseCase);
    bind(TOKENS.CancelOrderUseCase).to(CancelOrderUseCase);
    bind(TOKENS.GetSessionOrdersUseCase).to(GetSessionOrdersUseCase);
    bind(TOKENS.GetMenuUseCase).to(GetMenuUseCase);
    bind(TOKENS.CreateMenuItemUseCase).to(CreateMenuItemUseCase);
    bind(TOKENS.UpdateMenuItemUseCase).to(UpdateMenuItemUseCase);
    bind(TOKENS.DeleteMenuItemUseCase).to(DeleteMenuItemUseCase);
});
