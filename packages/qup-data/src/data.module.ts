import { ContainerModule } from "inversify";
import { TOKENS } from "@m0n0lab/qup-domain";
import { PgMenuItemRepository } from "./repositories/pg-menu-item.repository.ts";
import { PgOrderRepository } from "./repositories/pg-order.repository.ts";
import { PgSessionRepository } from "./repositories/pg-session.repository.ts";

export const dataModule = new ContainerModule((bind) => {
    bind(TOKENS.SessionRepository).to(PgSessionRepository);
    bind(TOKENS.OrderRepository).to(PgOrderRepository);
    bind(TOKENS.MenuItemRepository).to(PgMenuItemRepository);
});
