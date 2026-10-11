import { index, route } from "@react-router/dev/routes";
import type { RouteConfig } from "@react-router/dev/routes";

export default [
    index("routes/_index.tsx"),
    route("portfolio", "routes/portfolio.tsx"),
] satisfies RouteConfig;
