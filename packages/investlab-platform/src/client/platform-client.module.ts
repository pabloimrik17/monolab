import { ContainerModule } from "inversify";
import { HttpClient } from "../shared/http-client.ts";
import { InvestlabApiClient } from "./investlab-api-client.ts";
import { PLATFORM } from "./tokens.ts";

/** Infrastructure built from `PLATFORM.Config`, which the composition root binds. */
export const platformClientModule = new ContainerModule(({ bind }) => {
    bind(PLATFORM.HttpClient).to(HttpClient).inSingletonScope();
    bind(PLATFORM.InvestlabApiClient).to(InvestlabApiClient).inSingletonScope();
});
