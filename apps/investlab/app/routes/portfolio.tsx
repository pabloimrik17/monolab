import { PortfolioPage } from "../components/portfolio/portfolio-page";
import {
    createPortfolioItemFormSchema,
    portfolioItemIdFormSchema,
    updatePortfolioItemFormSchema,
} from "../lib/portfolio-item-form";
import { addHolding, changeHolding, listPortfolio, removeHolding } from "../lib/portfolio.server";
import { remoteErrorMessage, remoteErrorStatus } from "../lib/remote-error";
import type { PortfolioFieldErrors } from "../components/portfolio/types";
import type { Route } from "./+types/portfolio";
import type { PortfolioRemoteError } from "@m0n0lab/investlab-portfolio";
import type { z } from "zod";

export async function loader(_: Route.LoaderArgs) {
    const result = await listPortfolio();

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

type ActionResult = { ok: true } | { error: string; fieldErrors?: PortfolioFieldErrors };

const succeeded = (): ActionResult => ({ ok: true });
const failed = (error: PortfolioRemoteError): ActionResult => ({
    error: remoteErrorMessage(error),
});

function invalid(error: z.ZodError): ActionResult {
    const fieldErrors = Object.fromEntries(
        Object.entries(error.flatten().fieldErrors).map(([field, messages]) => [
            field,
            messages?.[0],
        ]),
    );
    return { error: "Please fix the highlighted fields.", fieldErrors };
}

async function createItem(formData: FormData): Promise<ActionResult> {
    const parsed = createPortfolioItemFormSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return invalid(parsed.error);
    const result = await addHolding(parsed.data);
    return result.match(succeeded, failed);
}

async function updateItem(formData: FormData): Promise<ActionResult> {
    const parsed = updatePortfolioItemFormSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return invalid(parsed.error);
    const { id, expectedUpdatedAt, ...changes } = parsed.data;
    const result = await changeHolding(id, changes, expectedUpdatedAt);
    return result.match(succeeded, failed);
}

async function deleteItem(formData: FormData): Promise<ActionResult> {
    const parsed = portfolioItemIdFormSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return invalid(parsed.error);
    const result = await removeHolding(parsed.data.id);
    return result.match(succeeded, failed);
}

const intentHandlers = new Map<string, (formData: FormData) => Promise<ActionResult>>([
    ["create", createItem],
    ["update", updateItem],
    ["delete", deleteItem],
]);

export async function action({ request }: Route.ActionArgs): Promise<ActionResult> {
    const formData = await request.formData();
    const intent = String(formData.get("intent") ?? "");
    const handler = intentHandlers.get(intent);
    return handler ? handler(formData) : { error: `Unknown intent: ${intent}` };
}

export default function PortfolioRoute({ loaderData }: Route.ComponentProps) {
    return (
        <PortfolioPage
            items={loaderData.items}
            instruments={loaderData.instruments}
        />
    );
}
