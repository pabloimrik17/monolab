import { remoteErrorMessage, remoteErrorStatus } from "#core/mapper/remote-error.mapper";
import { getContainer } from "#di/container.server";
import {
    createPortfolioItemFormSchema,
    portfolioItemIdFormSchema,
    updatePortfolioItemFormSchema,
    type PortfolioActionResult,
} from "#portfolio/form/portfolio-item.form";
import { PortfolioPage, type PortfolioPageProps } from "#portfolio/page/portfolio.page";
import { PORTFOLIO } from "@m0n0lab/investlab-portfolio/client";
import type { Route } from "./+types/portfolio";
import type { PortfolioRemoteError } from "@m0n0lab/investlab-portfolio";
import type { z } from "zod";

export async function loader(_: Route.LoaderArgs): Promise<PortfolioPageProps> {
    const result = await getContainer().get(PORTFOLIO.ItemList).execute();

    if (result.isErr()) {
        throw new Response(remoteErrorMessage(result.error), {
            status: remoteErrorStatus(result.error),
        });
    }

    const items = result.value.items.map(({ item, instrument }) => ({
        id: item.id,
        instrumentId: item.instrumentId,
        broker: item.broker,
        targetWeight: item.targetWeight,
        currentValue: item.currentValue,
        notes: item.notes,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        instrument: {
            id: instrument.id,
            symbol: instrument.symbol,
            name: instrument.name,
            type: instrument.type,
            assetClass: instrument.assetClass,
            replicates: instrument.replicates,
        },
    }));

    const instruments = result.value.instruments.map((instrument) => ({
        id: instrument.id,
        symbol: instrument.symbol,
        name: instrument.name,
        type: instrument.type,
        assetClass: instrument.assetClass,
    }));

    return { items, instruments };
}

const succeeded = (): PortfolioActionResult => ({ ok: true });
const failed = (error: PortfolioRemoteError): PortfolioActionResult => ({
    error: remoteErrorMessage(error),
});

function invalid(error: z.ZodError): PortfolioActionResult {
    const fieldErrors = Object.fromEntries(
        Object.entries(error.flatten().fieldErrors).map(([field, messages]) => [
            field,
            messages?.[0],
        ]),
    );
    return { error: "Please fix the highlighted fields.", fieldErrors };
}

async function createItem(formData: FormData): Promise<PortfolioActionResult> {
    const parsed = createPortfolioItemFormSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return invalid(parsed.error);
    const result = await getContainer().get(PORTFOLIO.ItemCreate).execute(parsed.data);
    return result.match(succeeded, failed);
}

async function updateItem(formData: FormData): Promise<PortfolioActionResult> {
    const parsed = updatePortfolioItemFormSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return invalid(parsed.error);
    const { id, expectedUpdatedAt, ...changes } = parsed.data;
    const result = await getContainer()
        .get(PORTFOLIO.ItemUpdate)
        .execute(id, changes, expectedUpdatedAt);
    return result.match(succeeded, failed);
}

async function deleteItem(formData: FormData): Promise<PortfolioActionResult> {
    const parsed = portfolioItemIdFormSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return invalid(parsed.error);
    const result = await getContainer().get(PORTFOLIO.ItemDelete).execute(parsed.data.id);
    return result.match(succeeded, failed);
}

const intentHandlers = new Map<string, (formData: FormData) => Promise<PortfolioActionResult>>([
    ["create", createItem],
    ["update", updateItem],
    ["delete", deleteItem],
]);

export async function action({ request }: Route.ActionArgs): Promise<PortfolioActionResult> {
    const formData = await request.formData();
    const intent = String(formData.get("intent") ?? "");
    const handler = intentHandlers.get(intent);
    return handler ? handler(formData) : { error: `Unknown intent: ${intent}` };
}

export default function PortfolioRoute({ loaderData }: Route.ComponentProps): React.JSX.Element {
    return (
        <PortfolioPage
            items={loaderData.items}
            instruments={loaderData.instruments}
        />
    );
}
