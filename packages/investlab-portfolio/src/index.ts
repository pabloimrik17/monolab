// Domain
export {
    InstrumentNotFoundError,
    PortfolioItemConflictError,
    PortfolioItemNotFoundError,
    type PortfolioErrorCode,
    type PortfolioRemoteError,
} from "./domain/errors.ts";
export { AssetClass } from "./domain/value-objects/asset-class.ts";
export { InstrumentType } from "./domain/value-objects/instrument-type.ts";
export { Sector } from "./domain/value-objects/sector.ts";
export { Instrument, type InstrumentProps } from "./domain/entities/instrument.ts";
export { PortfolioItem, type PortfolioItemProps } from "./domain/entities/portfolio-item.ts";
export type { InstrumentRepository } from "./domain/ports/instrument.repository.ts";
export type { PortfolioItemRepository } from "./domain/ports/portfolio-item.repository.ts";
export type { PortfolioItemQuery } from "./domain/ports/portfolio-item.query.ts";
export type { PortfolioItemListQuery } from "./domain/ports/portfolio-item-list.query.ts";
export type { PortfolioItemWithInstrument } from "./domain/read-models/portfolio-item-with-instrument.ts";
export type { PortfolioItemList } from "./domain/read-models/portfolio-item-list.ts";

// Contracts
export { instrumentDtoSchema, type InstrumentDto } from "./data/contracts/instrument.dto.ts";
export {
    createPortfolioItemDtoSchema,
    portfolioItemDtoSchema,
    updatePortfolioItemDtoSchema,
    type CreatePortfolioItemDto,
    type PortfolioItemDto,
    type UpdatePortfolioItemDto,
} from "./data/contracts/portfolio-item.dto.ts";
export {
    portfolioItemListDtoSchema,
    portfolioItemWithInstrumentDtoSchema,
    type PortfolioItemListDto,
    type PortfolioItemWithInstrumentDto,
} from "./data/contracts/portfolio-item-list.dto.ts";
