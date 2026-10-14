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
import type { NetworkError, UnauthorizedError } from "@m0n0lab/investlab-core";
import type { Instrument, PortfolioItem, PortfolioRemoteError } from "@m0n0lab/investlab-domain";
import type { ResultAsync } from "neverthrow";

describe("client use case error unions add NetworkError", () => {
    test("PortfolioRemoteError includes NetworkError", () => {
        expectTypeOf<NetworkError>().toExtend<PortfolioRemoteError>();
    });

    test("PortfolioRemoteError includes UnauthorizedError", () => {
        expectTypeOf<UnauthorizedError>().toExtend<PortfolioRemoteError>();
    });

    test("PortfolioItemCreateError", () => {
        expectTypeOf<PortfolioItemCreateError>().toEqualTypeOf<PortfolioRemoteError>();
        expectTypeOf<ReturnType<PortfolioItemCreateUseCase["execute"]>>().toEqualTypeOf<
            ResultAsync<PortfolioItem, PortfolioItemCreateError>
        >();
    });

    test("PortfolioItemUpdateError", () => {
        expectTypeOf<PortfolioItemUpdateError>().toEqualTypeOf<PortfolioRemoteError>();
        expectTypeOf<ReturnType<PortfolioItemUpdateUseCase["execute"]>>().toEqualTypeOf<
            ResultAsync<PortfolioItem, PortfolioItemUpdateError>
        >();
    });

    test("PortfolioItemDeleteError", () => {
        expectTypeOf<PortfolioItemDeleteError>().toEqualTypeOf<PortfolioRemoteError>();
        expectTypeOf<ReturnType<PortfolioItemDeleteUseCase["execute"]>>().toEqualTypeOf<
            ResultAsync<void, PortfolioItemDeleteError>
        >();
    });

    test("PortfolioItemListError", () => {
        expectTypeOf<PortfolioItemListError>().toEqualTypeOf<PortfolioRemoteError>();
        expectTypeOf<ReturnType<PortfolioItemListUseCase["execute"]>>().toEqualTypeOf<
            ResultAsync<PortfolioItemList, PortfolioItemListError>
        >();
    });

    test("InstrumentListError", () => {
        expectTypeOf<InstrumentListError>().toEqualTypeOf<PortfolioRemoteError>();
        expectTypeOf<ReturnType<InstrumentListUseCase["execute"]>>().toEqualTypeOf<
            ResultAsync<Instrument[], InstrumentListError>
        >();
    });
});
