import { z } from "zod";

// Mirror the portfolio_items column limits: broker varchar(100), current_value numeric(12,2).
const brokerSchema = z.string().trim().min(1).max(100);
const targetWeightSchema = z.number().min(0).max(100);
const currentValueSchema = z.number().min(0).max(9_999_999_999.99);

export const portfolioItemDtoSchema = z.object({
    id: z.string().uuid(),
    instrumentId: z.string().uuid(),
    broker: brokerSchema,
    targetWeight: targetWeightSchema,
    currentValue: currentValueSchema,
    notes: z.string().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export type PortfolioItemDto = z.infer<typeof portfolioItemDtoSchema>;

export const createPortfolioItemDtoSchema = z.object({
    instrumentId: z.string().uuid(),
    broker: brokerSchema,
    targetWeight: targetWeightSchema,
    currentValue: currentValueSchema.optional(),
    notes: z.string().optional(),
});

export type CreatePortfolioItemDto = z.infer<typeof createPortfolioItemDtoSchema>;

export const updatePortfolioItemDtoSchema = z.object({
    broker: brokerSchema.optional(),
    targetWeight: targetWeightSchema.optional(),
    currentValue: currentValueSchema.optional(),
    notes: z.string().optional(),
});

export type UpdatePortfolioItemDto = z.infer<typeof updatePortfolioItemDtoSchema>;
