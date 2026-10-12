import { APP_TOKENS, type QuoteListUseCase } from "@m0n0lab/investlab-application-client";
import { quoteListQueryDtoSchema, type QuoteDto } from "@m0n0lab/investlab-data-contracts";
import { getContainer } from "../lib/container.server";
import { remoteErrorMessage, remoteErrorStatus } from "../lib/remote-error";
import type { Route } from "./+types/api.quotes";

/** `GET /api/quotes?symbols=AAPL,MSFT`: the browser ticker poller's only way to the API's quotes. */
export async function loader({ request }: Route.LoaderArgs): Promise<Response> {
    const query = quoteListQueryDtoSchema.safeParse({
        symbols: new URL(request.url).searchParams.get("symbols") ?? undefined,
    });
    if (!query.success) {
        return Response.json({ message: "At least one symbol is required" }, { status: 422 });
    }

    const useCase = getContainer().get<QuoteListUseCase>(APP_TOKENS.QuoteListUseCase);
    const result = await useCase.execute(query.data.symbols);

    return result.match(
        (quotes) =>
            Response.json(
                quotes.map(
                    (quote): QuoteDto => ({ ...quote, updatedAt: quote.updatedAt.toISOString() }),
                ),
            ),
        (error) =>
            Response.json(
                { message: remoteErrorMessage(error) },
                { status: remoteErrorStatus(error) },
            ),
    );
}
