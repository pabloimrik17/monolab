export const TOKENS = {
    HttpClient: Symbol.for("HttpClient"),
    ApiClient: Symbol.for("ApiClient"),
    EventSourceService: Symbol.for("EventSourceService"),
    JoinSessionViewModel: Symbol.for("JoinSessionViewModel"),
    CreateOrderViewModel: Symbol.for("CreateOrderViewModel"),
    OrderStatusViewModel: Symbol.for("OrderStatusViewModel"),
    AdminLoginViewModel: Symbol.for("AdminLoginViewModel"),
    DashboardViewModel: Symbol.for("DashboardViewModel"),
    OrderQueueViewModel: Symbol.for("OrderQueueViewModel"),
    MenuManagementViewModel: Symbol.for("MenuManagementViewModel"),
} as const;
