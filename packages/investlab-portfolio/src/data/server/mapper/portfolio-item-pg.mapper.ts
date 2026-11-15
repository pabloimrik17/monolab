import { PortfolioItem } from "#domain/model/portfolio-item.model.ts";
import type { portfolioItems } from "#data/server/infra/db/portfolio-item.table.ts";

type PortfolioItemRow = typeof portfolioItems.$inferSelect;
type PortfolioItemInsert = typeof portfolioItems.$inferInsert;

export function portfolioItemToDomain(row: PortfolioItemRow): PortfolioItem {
    return PortfolioItem.reconstitute({
        id: row.id,
        instrumentId: row.instrumentId,
        broker: row.broker,
        targetWeight: Number(row.targetWeight),
        currentValue: Number(row.currentValue),
        notes: row.notes ?? undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    });
}

export function portfolioItemToRow(item: PortfolioItem): PortfolioItemInsert {
    return {
        id: item.id,
        instrumentId: item.instrumentId,
        broker: item.broker,
        targetWeight: item.targetWeight.toString(),
        currentValue: item.currentValue.toString(),
        notes: item.notes ?? null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    };
}
