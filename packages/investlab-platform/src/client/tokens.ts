import type { HttpClient } from "../shared/http-client.ts";
import type { ClientConfig } from "./config.ts";
import type { InvestlabApiClient } from "./investlab-api-client.ts";
import type { ServiceIdentifier } from "inversify";

export const PLATFORM = {
    Config: Symbol.for("investlab.platform.client.Config") as ServiceIdentifier<ClientConfig>,
    HttpClient: Symbol.for("investlab.platform.client.HttpClient") as ServiceIdentifier<HttpClient>,
    InvestlabApiClient: Symbol.for(
        "investlab.platform.client.InvestlabApiClient",
    ) as ServiceIdentifier<InvestlabApiClient>,
} as const;
