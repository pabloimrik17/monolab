import { PORTFOLIO } from "@m0n0lab/investlab-portfolio/client";
import { remoteErrorMessage } from "../../core/mapper/remote-error.mapper";
import { getContainer } from "../../lib/container.server";
import {
    createPortfolioItemFormSchema,
    portfolioItemIdFormSchema,
    updatePortfolioItemFormSchema,
} from "../form/portfolio-item.form";
import type { PortfolioFieldErrors } from "../view-model/portfolio.view-model";
import type { PortfolioRemoteError } from "@m0n0lab/investlab-portfolio";
import type { ActionFunctionArgs } from "react-router";
import type { z } from "zod";

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
    const result = await getContainer().get(PORTFOLIO.ItemCreate).execute(parsed.data);
    return result.match(succeeded, failed);
}

async function updateItem(formData: FormData): Promise<ActionResult> {
    const parsed = updatePortfolioItemFormSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return invalid(parsed.error);
    const { id, expectedUpdatedAt, ...changes } = parsed.data;
    const result = await getContainer()
        .get(PORTFOLIO.ItemUpdate)
        .execute(id, changes, expectedUpdatedAt);
    return result.match(succeeded, failed);
}

async function deleteItem(formData: FormData): Promise<ActionResult> {
    const parsed = portfolioItemIdFormSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return invalid(parsed.error);
    const result = await getContainer().get(PORTFOLIO.ItemDelete).execute(parsed.data.id);
    return result.match(succeeded, failed);
}

const intentHandlers = new Map<string, (formData: FormData) => Promise<ActionResult>>([
    ["create", createItem],
    ["update", updateItem],
    ["delete", deleteItem],
]);

export async function action({ request }: ActionFunctionArgs): Promise<ActionResult> {
    const formData = await request.formData();
    const intent = String(formData.get("intent") ?? "");
    const handler = intentHandlers.get(intent);
    return handler ? handler(formData) : { error: `Unknown intent: ${intent}` };
}
