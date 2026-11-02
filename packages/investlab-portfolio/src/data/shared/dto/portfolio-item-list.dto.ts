import { z } from "zod";
import { instrumentDtoSchema } from "./instrument.dto.ts";
import { portfolioItemDtoSchema } from "./portfolio-item.dto.ts";

export const portfolioItemWithInstrumentDtoSchema = z.object({
    item: portfolioItemDtoSchema,
    instrument: instrumentDtoSchema,
});

export type PortfolioItemWithInstrumentDto = z.infer<typeof portfolioItemWithInstrumentDtoSchema>;

export const portfolioItemListDtoSchema = z.object({
    items: z.array(portfolioItemWithInstrumentDtoSchema),
    instruments: z.array(instrumentDtoSchema),
});

export type PortfolioItemListDto = z.infer<typeof portfolioItemListDtoSchema>;
