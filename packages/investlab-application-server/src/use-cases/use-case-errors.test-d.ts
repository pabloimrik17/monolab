import { describe, expectTypeOf, test } from "vitest";
import type {
    PortfolioItemCreateError,
    PortfolioItemCreateUseCase,
} from "./portfolio-item-create.use-case.ts";
import type {
    PortfolioItemDeleteError,
    PortfolioItemDeleteUseCase,
} from "./portfolio-item-delete.use-case.ts";
import type {
    PortfolioItemList,
    PortfolioItemListError,
    PortfolioItemListUseCase,
} from "./portfolio-item-list.use-case.ts";
import type {
    PortfolioItemUpdateError,
    PortfolioItemUpdateUseCase,
} from "./portfolio-item-update.use-case.ts";
import type { QuoteListError, QuoteListUseCase } from "./quote-list.use-case.ts";
import type {
    InstrumentNotFoundError,
    PersistenceError,
    PortfolioItem,
    PortfolioItemNotFoundError,
    Quote,
    ValidationError,
} from "@m0n0lab/investlab-domain";
import type { ResultAsync } from "neverthrow";

describe("use case error unions", () => {
    test("PortfolioItemCreateError", () => {
        expectTypeOf<PortfolioItemCreateError>().toEqualTypeOf<
            ValidationError | InstrumentNotFoundError | PersistenceError
        >();
        expectTypeOf<ReturnType<PortfolioItemCreateUseCase["execute"]>>().toEqualTypeOf<
            ResultAsync<PortfolioItem, PortfolioItemCreateError>
        >();
    });

    test("PortfolioItemUpdateError", () => {
        expectTypeOf<PortfolioItemUpdateError>().toEqualTypeOf<
            ValidationError | PortfolioItemNotFoundError | PersistenceError
        >();
        expectTypeOf<ReturnType<PortfolioItemUpdateUseCase["execute"]>>().toEqualTypeOf<
            ResultAsync<PortfolioItem, PortfolioItemUpdateError>
        >();
    });

    test("PortfolioItemDeleteError", () => {
        expectTypeOf<PortfolioItemDeleteError>().toEqualTypeOf<
            PortfolioItemNotFoundError | PersistenceError
        >();
        expectTypeOf<ReturnType<PortfolioItemDeleteUseCase["execute"]>>().toEqualTypeOf<
            ResultAsync<void, PortfolioItemDeleteError>
        >();
    });

    test("PortfolioItemListError", () => {
        expectTypeOf<PortfolioItemListError>().toEqualTypeOf<PersistenceError>();
        expectTypeOf<ReturnType<PortfolioItemListUseCase["execute"]>>().toEqualTypeOf<
            ResultAsync<PortfolioItemList, PortfolioItemListError>
        >();
    });

    test("QuoteListError", () => {
        expectTypeOf<QuoteListError>().toEqualTypeOf<PersistenceError>();
        expectTypeOf<ReturnType<QuoteListUseCase["execute"]>>().toEqualTypeOf<
            ResultAsync<Quote[], QuoteListError>
        >();
    });
});
