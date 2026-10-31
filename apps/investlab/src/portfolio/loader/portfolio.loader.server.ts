import { remoteErrorMessage, remoteErrorStatus } from "#core/mapper/remote-error.mapper";
import { getContainer } from "#di/container.server";
import { PORTFOLIO } from "@m0n0lab/investlab-portfolio/client";
import type { LoaderFunctionArgs } from "react-router";

export async function loader(_: LoaderFunctionArgs) {
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
