import { Container } from "inversify";
import { portfolioModule } from "@m0n0lab/investlab-application-server";
import { dataModule, portfolioDataModule, quoteDataModule } from "@m0n0lab/investlab-data-server";
import {
    PLATFORM,
    platformServerModule,
    ProcessEnvConfig,
} from "@m0n0lab/investlab-platform/server";

/** Composition root: `Config` from `process.env`; clients connect on first use, not here. */
export function createContainer(): Container {
    const container = new Container();
    container.bind(PLATFORM.Config).to(ProcessEnvConfig).inSingletonScope();
    container.load(
        platformServerModule,
        dataModule,
        portfolioDataModule,
        quoteDataModule,
        portfolioModule,
    );
    return container;
}
