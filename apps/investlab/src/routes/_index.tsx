import { TickerPage } from "#quotes/page/ticker.page";
import type { Route } from "./+types/_index";
import type { FC } from "react";

const IndexRoute: FC<Route.ComponentProps> = () => {
    return <TickerPage />;
};

export default IndexRoute;
