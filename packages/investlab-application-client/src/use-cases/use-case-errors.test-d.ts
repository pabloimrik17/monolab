import { describe, expectTypeOf, test } from "vitest";
import type { InstrumentListError, InstrumentListUseCase } from "./instrument-list.use-case.ts";
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
    Instrument,
    NetworkError,
    PortfolioItem,
    Quote,
    RemotePortError,
} from "@m0n0lab/investlab-domain";
import type { ResultAsync } from "neverthrow";

describe("client use case error unions add NetworkError", () => {
    test("RemotePortError includes NetworkError", () => {
        expectTypeOf<NetworkError>().toExtend<RemotePortError>();
    });

    test("PortfolioItemCreateError", () => {
        expectTypeOf<PortfolioItemCreateError>().toEqualTypeOf<RemotePortError>();
        expectTypeOf<ReturnType<PortfolioItemCreateUseCase["execute"]>>().toEqualTypeOf<
            ResultAsync<PortfolioItem, PortfolioItemCreateError>
        >();
    });

    test("PortfolioItemUpdateError", () => {
        expectTypeOf<PortfolioItemUpdateError>().toEqualTypeOf<RemotePortError>();
        expectTypeOf<ReturnType<PortfolioItemUpdateUseCase["execute"]>>().toEqualTypeOf<
            ResultAsync<PortfolioItem, PortfolioItemUpdateError>
        >();
    });

    test("PortfolioItemDeleteError", () => {
        expectTypeOf<PortfolioItemDeleteError>().toEqualTypeOf<RemotePortError>();
        expectTypeOf<ReturnType<PortfolioItemDeleteUseCase["execute"]>>().toEqualTypeOf<
            ResultAsync<void, PortfolioItemDeleteError>
        >();
    });

    test("PortfolioItemListError", () => {
        expectTypeOf<PortfolioItemListError>().toEqualTypeOf<RemotePortError>();
        expectTypeOf<ReturnType<PortfolioItemListUseCase["execute"]>>().toEqualTypeOf<
            ResultAsync<PortfolioItemList, PortfolioItemListError>
        >();
    });

    test("InstrumentListError", () => {
        expectTypeOf<InstrumentListError>().toEqualTypeOf<RemotePortError>();
        expectTypeOf<ReturnType<InstrumentListUseCase["execute"]>>().toEqualTypeOf<
            ResultAsync<Instrument[], InstrumentListError>
        >();
    });

    test("QuoteListError", () => {
        expectTypeOf<QuoteListError>().toEqualTypeOf<RemotePortError>();
        expectTypeOf<ReturnType<QuoteListUseCase["execute"]>>().toEqualTypeOf<
            ResultAsync<Quote[], QuoteListError>
        >();
    });
});
