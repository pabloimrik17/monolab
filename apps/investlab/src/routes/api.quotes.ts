import { remoteErrorMessage, remoteErrorStatus } from "#core/mapper/remote-error.mapper";
import { getContainer } from "#di/container.server";
import { quoteListQueryDtoSchema, type QuoteDto } from "@m0n0lab/investlab-quotes";
import { QUOTES } from "@m0n0lab/investlab-quotes/client";
import type { Route } from "./+types/api.quotes";

/** `GET /api/quotes?symbols=AAPL,MSFT`: the browser ticker poller's only way to the API's quotes. */
export async function loader({ request }: Route.LoaderArgs): Promise<Response> {
    const query = quoteListQueryDtoSchema.safeParse({
        symbols: new URL(request.url).searchParams.get("symbols") ?? undefined,
    });
    if (!query.success) {
        return Response.json(
            { message: query.error.issues[0]?.message ?? "Invalid symbols" },
            { status: 422 },
        );
    }

    const result = await getContainer().get(QUOTES.List).execute(query.data.symbols);

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
