import { ContainerModule } from "inversify";
import { ApiClient } from "./services/api-client.ts";
import { EventSourceService } from "./services/event-source.service.ts";
import { HttpClient } from "./services/http-client.ts";
import { TOKENS } from "./tokens.ts";
import { AdminLoginViewModel } from "./view-models/admin-login.viewmodel.ts";
import { CreateOrderViewModel } from "./view-models/create-order.viewmodel.ts";
import { DashboardViewModel } from "./view-models/dashboard.viewmodel.ts";
import { JoinSessionViewModel } from "./view-models/join-session.viewmodel.ts";
import { MenuManagementViewModel } from "./view-models/menu-management.viewmodel.ts";
import { OrderQueueViewModel } from "./view-models/order-queue.viewmodel.ts";
import { OrderStatusViewModel } from "./view-models/order-status.viewmodel.ts";

export const webModule = new ContainerModule(({ bind }) => {
    bind(TOKENS.HttpClient).to(HttpClient).inSingletonScope();
    bind(TOKENS.ApiClient).to(ApiClient).inSingletonScope();
    bind(TOKENS.EventSourceService).to(EventSourceService).inSingletonScope();
    bind(TOKENS.JoinSessionViewModel).to(JoinSessionViewModel);
    bind(TOKENS.CreateOrderViewModel).to(CreateOrderViewModel);
    bind(TOKENS.OrderStatusViewModel).to(OrderStatusViewModel);
    bind(TOKENS.AdminLoginViewModel).to(AdminLoginViewModel);
    bind(TOKENS.DashboardViewModel).to(DashboardViewModel);
    bind(TOKENS.OrderQueueViewModel).to(OrderQueueViewModel);
    bind(TOKENS.MenuManagementViewModel).to(MenuManagementViewModel);
});
