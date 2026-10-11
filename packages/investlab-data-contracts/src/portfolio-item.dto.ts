import { z } from "zod";

export const portfolioItemDtoSchema = z.object({
    id: z.string().uuid(),
    instrumentId: z.string().uuid(),
    broker: z.string().min(1).max(100),
    targetWeight: z.number().min(0).max(100),
    currentValue: z.number().min(0),
    notes: z.string().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export type PortfolioItemDto = z.infer<typeof portfolioItemDtoSchema>;

export const createPortfolioItemDtoSchema = z.object({
    instrumentId: z.string().uuid(),
    broker: z.string().min(1).max(100),
    targetWeight: z.number().min(0).max(100),
    currentValue: z.number().min(0).optional(),
    notes: z.string().optional(),
});

export type CreatePortfolioItemDto = z.infer<typeof createPortfolioItemDtoSchema>;

export const updatePortfolioItemDtoSchema = z.object({
    broker: z.string().min(1).max(100).optional(),
    targetWeight: z.number().min(0).max(100).optional(),
    currentValue: z.number().min(0).optional(),
    notes: z.string().optional(),
});

export type UpdatePortfolioItemDto = z.infer<typeof updatePortfolioItemDtoSchema>;
