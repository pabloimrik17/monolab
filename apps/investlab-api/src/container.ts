import { Container } from "inversify";
import { portfolioModule } from "@m0n0lab/investlab-application-server";
import { dataModule, portfolioDataModule } from "@m0n0lab/investlab-data-server";
import {
    PLATFORM,
    platformServerModule,
    ProcessEnvConfig,
} from "@m0n0lab/investlab-platform/server";
import { quotesServerModule } from "@m0n0lab/investlab-quotes/server";

/** Composition root: `Config` from `process.env`; clients connect on first use, not here. */
export function createContainer(): Container {
    const container = new Container();
    container.bind(PLATFORM.Config).to(ProcessEnvConfig).inSingletonScope();
    container.load(
        platformServerModule,
        dataModule,
        portfolioDataModule,
        portfolioModule,
        quotesServerModule,
    );
    return container;
}
