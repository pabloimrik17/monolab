import { remoteErrorMessage, remoteErrorStatus } from "#core/mapper/remote-error.mapper";
import { getContainer } from "#di/container.server";
import {
    parseCreateEntryForm,
    parseEntryIdForm,
    parseReEnterEntryForm,
    parseTransitionEntryForm,
    parseUpdateEntryForm,
    type RogerActionResult,
} from "#roger/form/entry.form";
import { RogerPage } from "#roger/page/roger.page";
import { CATALOG } from "@m0n0lab/investlab-catalog/client";
import { ROGER } from "@m0n0lab/investlab-roger/client";
import type { RogerFieldErrors, RogerPageProps } from "#roger/view-model/roger.view-model";
import type { Route } from "./+types/roger";
import type { RogerRemoteError } from "@m0n0lab/investlab-roger";
import type { FC } from "react";
import type { z } from "zod";

export async function loader({ request }: Route.LoaderArgs): Promise<RogerPageProps> {
    const view = new URL(request.url).searchParams.get("view") === "history" ? "history" : "active";
    const container = getContainer();
    const [entries, instruments] = await Promise.all([
        container.get(ROGER.EntryList).execute(view),
        container.get(CATALOG.InstrumentList).execute(),
    ]);

    if (entries.isErr()) {
        throw new Response(remoteErrorMessage(entries.error), {
            status: remoteErrorStatus(entries.error),
        });
    }
    if (instruments.isErr()) {
        throw new Response(remoteErrorMessage(instruments.error), {
            status: remoteErrorStatus(instruments.error),
        });
    }

    return {
        view,
        entries: entries.value.map(({ entry, instrument }) => ({
            id: entry.id,
            instrumentId: entry.instrumentId,
            state: entry.state,
            entryPrice: entry.entryPrice,
            quantity: entry.quantity,
            buyCommission: entry.buyCommission,
            buyDate: entry.buyDate,
            exitPrice: entry.exitPrice,
            sellCommission: entry.sellCommission,
            sellDate: entry.sellDate,
            stateSince: entry.stateSince.toISOString(),
            createdAt: entry.createdAt.toISOString(),
            updatedAt: entry.updatedAt.toISOString(),
            instrument: {
                symbol: instrument.symbol,
                name: instrument.name,
                sector: instrument.sector,
            },
        })),
        instruments: instruments.value.map((instrument) => ({
            id: instrument.id,
            symbol: instrument.symbol,
            name: instrument.name,
            type: instrument.type,
            assetClass: instrument.assetClass,
        })),
    };
}

const succeeded = (): RogerActionResult => ({ ok: true });

function failed(error: RogerRemoteError): RogerActionResult {
    const message = remoteErrorMessage(error);
    switch (error.code) {
        case "MISSING_REQUIRED_FIELD":
        case "FIELD_NOT_IN_STATE":
            return { error: message, fieldErrors: { [error.field]: message } };
        case "INSTRUMENT_NOT_FOUND":
            return { error: message, fieldErrors: { instrumentId: message } };
        case "INSTRUMENT_ALREADY_EXISTS":
            return { error: message, fieldErrors: { symbol: message } };
        default:
            return { error: message };
    }
}

function invalid(error: z.ZodError): RogerActionResult {
    const fieldErrors: RogerFieldErrors = Object.fromEntries(
        Object.entries(error.flatten().fieldErrors).map(([field, messages]) => [
            field,
            messages?.[0],
        ]),
    );
    return { error: "Please fix the highlighted fields.", fieldErrors };
}

async function createEntry(formData: FormData): Promise<RogerActionResult> {
    const parsed = parseCreateEntryForm(Object.fromEntries(formData));
    if (!parsed.success) return invalid(parsed.error);
    const result = await getContainer().get(ROGER.EntryCreate).execute(parsed.data);
    return result.match(succeeded, failed);
}

async function updateEntry(formData: FormData): Promise<RogerActionResult> {
    const parsed = parseUpdateEntryForm(Object.fromEntries(formData));
    if (!parsed.success) return invalid(parsed.error);
    const { current, values } = parsed.data;
    const result = await getContainer().get(ROGER.EntryEdit).execute(current, values);
    return result.match(succeeded, failed);
}

async function deleteEntry(formData: FormData): Promise<RogerActionResult> {
    const parsed = parseEntryIdForm(Object.fromEntries(formData));
    if (!parsed.success) return invalid(parsed.error);
    const result = await getContainer().get(ROGER.EntryDelete).execute(parsed.data.id);
    return result.match(succeeded, failed);
}

async function transitionEntry(formData: FormData): Promise<RogerActionResult> {
    const parsed = parseTransitionEntryForm(Object.fromEntries(formData));
    if (!parsed.success) return invalid(parsed.error);
    const { current, to, values } = parsed.data;
    const result = await getContainer().get(ROGER.EntryTransition).execute(current, to, values);
    return result.match(succeeded, failed);
}

async function reEnterEntry(formData: FormData): Promise<RogerActionResult> {
    const parsed = parseReEnterEntryForm(Object.fromEntries(formData));
    if (!parsed.success) return invalid(parsed.error);
    const { current, values } = parsed.data;
    const result = await getContainer().get(ROGER.EntryReEnter).execute(current, values);
    return result.match(succeeded, failed);
}

const intentHandlers = new Map<string, (formData: FormData) => Promise<RogerActionResult>>([
    ["create", createEntry],
    ["update", updateEntry],
    ["delete", deleteEntry],
    ["transition", transitionEntry],
    ["re-enter", reEnterEntry],
]);

export async function action({ request }: Route.ActionArgs): Promise<RogerActionResult> {
    const formData = await request.formData();
    const intent = String(formData.get("intent") ?? "");
    const handler = intentHandlers.get(intent);
    return handler ? handler(formData) : { error: `Unknown intent: ${intent}` };
}

const RogerRoute: FC<Route.ComponentProps> = ({ loaderData }) => {
    return (
        <RogerPage
            view={loaderData.view}
            entries={loaderData.entries}
            instruments={loaderData.instruments}
        />
    );
};

export default RogerRoute;
