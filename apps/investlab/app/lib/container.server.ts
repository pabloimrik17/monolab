import { Container } from "inversify";
import { applicationClientModule } from "@m0n0lab/investlab-application-client";
import { dataClientModule } from "@m0n0lab/investlab-data-client";
import { PLATFORM, platformClientModule, SsrEnvConfig } from "@m0n0lab/investlab-platform/client";
import { quotesClientModule } from "@m0n0lab/investlab-quotes/client";

/** Composition root: `Config` from the SSR env, everything else from the modules. */
export function createContainer(): Container {
    const container = new Container();
    container.bind(PLATFORM.Config).to(SsrEnvConfig).inSingletonScope();
    container.load(
        platformClientModule,
        dataClientModule,
        applicationClientModule,
        quotesClientModule,
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
