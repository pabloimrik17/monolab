import { ContainerModule } from "inversify";
import { InvestlabApiClient } from "../client/http/investlab-api.client.ts";
import { PLATFORM } from "../client/tokens.ts";
import { HttpClient } from "../shared/http/http.client.ts";

/** Infrastructure built from `PLATFORM.Config`, which the composition root binds. */
export const platformClientModule = new ContainerModule(({ bind }) => {
    bind(PLATFORM.HttpClient).to(HttpClient).inSingletonScope();
    bind(PLATFORM.InvestlabApiClient).to(InvestlabApiClient).inSingletonScope();
});
