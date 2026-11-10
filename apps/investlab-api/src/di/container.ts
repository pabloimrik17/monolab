import { Container } from "inversify";
import { catalogServerModule } from "@m0n0lab/investlab-catalog/server";
import {
    PLATFORM,
    platformServerModule,
    ProcessEnvConfig,
} from "@m0n0lab/investlab-platform/server";
import { portfolioServerModule } from "@m0n0lab/investlab-portfolio/server";
import { quotesServerModule } from "@m0n0lab/investlab-quotes/server";

/** Composition root: `Config` from `process.env`; clients connect on first use, not here. */
export function createContainer(): Container {
    const container = new Container();
    container.bind(PLATFORM.Config).to(ProcessEnvConfig).inSingletonScope();
    container.load(
        platformServerModule,
        catalogServerModule,
        portfolioServerModule,
        quotesServerModule,
    );
    return container;
}
