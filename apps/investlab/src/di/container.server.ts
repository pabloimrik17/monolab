import { Container } from "inversify";
import { catalogClientModule } from "@m0n0lab/investlab-catalog/client";
import { PLATFORM, platformClientModule, SsrEnvConfig } from "@m0n0lab/investlab-platform/client";
import { portfolioClientModule } from "@m0n0lab/investlab-portfolio/client";
import { quotesClientModule } from "@m0n0lab/investlab-quotes/client";
import { rogerClientModule } from "@m0n0lab/investlab-roger/client";

/** Composition root: `Config` from the SSR env, everything else from the modules. */
export function createContainer(): Container {
    const container = new Container();
    container.bind(PLATFORM.Config).to(SsrEnvConfig).inSingletonScope();
    container.load(
        platformClientModule,
        catalogClientModule,
        portfolioClientModule,
        quotesClientModule,
        rogerClientModule,
    );
    return container;
}

let singleton: Container | null = null;

export function getContainer(): Container {
    if (singleton === null) {
        singleton = createContainer();
    }
    return singleton;
}
