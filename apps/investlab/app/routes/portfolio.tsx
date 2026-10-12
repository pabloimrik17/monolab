import {
    APP_TOKENS,
    type CreatePortfolioItemUseCase,
    type DeletePortfolioItemUseCase,
    type ListPortfolioItemsUseCase,
    type UpdatePortfolioItemUseCase,
} from "@m0n0lab/investlab-application-server";
import { TOKENS, type InstrumentRepository } from "@m0n0lab/investlab-domain";
import { PortfolioPage } from "../components/portfolio/portfolio-page";
import { getContainer } from "../lib/container.server";
import type { Route } from "./+types/portfolio";

export async function loader(_: Route.LoaderArgs) {
    const container = getContainer();
    const listUseCase = container.get<ListPortfolioItemsUseCase>(
        APP_TOKENS.ListPortfolioItemsUseCase,
    );
    const instrumentRepo = container.get<InstrumentRepository>(TOKENS.InstrumentRepository);

    const [itemsResult, instrumentsResult] = await Promise.all([
        listUseCase.execute(),
        instrumentRepo.findAll(),
    ]);

    if (itemsResult.isErr()) {
        throw new Response(itemsResult.error.message, { status: 500 });
    }
    if (instrumentsResult.isErr()) {
        throw new Response(instrumentsResult.error.message, { status: 500 });
    }

    const items = itemsResult.value.map(({ item, instrument }) => ({
        id: item.id,
        instrumentId: item.instrumentId,
        broker: item.broker,
        targetWeight: item.targetWeight,
        currentValue: item.currentValue,
        notes: item.notes,
        createdAt: item.createdAt.toISOString(),
        instrument: {
            id: instrument.id,
            symbol: instrument.symbol,
            name: instrument.name,
            type: instrument.type,
            assetClass: instrument.assetClass,
            replicates: instrument.replicates,
        },
    }));

    const instruments = instrumentsResult.value.map((instrument) => ({
        id: instrument.id,
        symbol: instrument.symbol,
        name: instrument.name,
        type: instrument.type,
        assetClass: instrument.assetClass,
    }));

    return { items, instruments };
}

type ActionResult = { ok: true } | { error: string };

const succeeded = (): ActionResult => ({ ok: true });
const failed = (error: { message: string }): ActionResult => ({ error: error.message });

function text(formData: FormData, key: string): string {
    return String(formData.get(key) ?? "");
}

function amount(formData: FormData, key: string): number {
    return Number(formData.get(key) ?? 0);
}

function notes(formData: FormData): string | undefined {
    const value = formData.get("notes");
    return value ? String(value) : undefined;
}

async function createItem(formData: FormData): Promise<ActionResult> {
    const useCase = getContainer().get<CreatePortfolioItemUseCase>(
        APP_TOKENS.CreatePortfolioItemUseCase,
    );
    const itemNotes = notes(formData);
    const result = await useCase.execute({
        instrumentId: text(formData, "instrumentId"),
        broker: text(formData, "broker"),
        targetWeight: amount(formData, "targetWeight"),
        currentValue: amount(formData, "currentValue"),
        ...(itemNotes ? { notes: itemNotes } : {}),
    });
    return result.match(succeeded, failed);
}

async function updateItem(formData: FormData): Promise<ActionResult> {
    const useCase = getContainer().get<UpdatePortfolioItemUseCase>(
        APP_TOKENS.UpdatePortfolioItemUseCase,
    );
    const result = await useCase.execute(text(formData, "id"), {
        broker: text(formData, "broker"),
        targetWeight: amount(formData, "targetWeight"),
        currentValue: amount(formData, "currentValue"),
        notes: notes(formData),
    });
    return result.match(succeeded, failed);
}

async function deleteItem(formData: FormData): Promise<ActionResult> {
    const useCase = getContainer().get<DeletePortfolioItemUseCase>(
        APP_TOKENS.DeletePortfolioItemUseCase,
    );
    const result = await useCase.execute(text(formData, "id"));
    return result.match(succeeded, failed);
}

const intentHandlers = new Map<string, (formData: FormData) => Promise<ActionResult>>([
    ["create", createItem],
    ["update", updateItem],
    ["delete", deleteItem],
]);

export async function action({ request }: Route.ActionArgs): Promise<ActionResult> {
    const formData = await request.formData();
    const intent = text(formData, "intent");
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
