import { TickerPage } from "#quotes/page/ticker.page";
import type { Route } from "./+types/_index";

export default function IndexRoute(_: Route.ComponentProps): React.JSX.Element {
    return <TickerPage />;
}
