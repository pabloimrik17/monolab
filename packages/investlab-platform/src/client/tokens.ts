import type { ClientConfig } from "#client/config/client.config.ts";
import type { InvestlabApiClient } from "#client/http/investlab-api.client.ts";
import type { HttpClient } from "#shared/http/http.client.ts";
import type { ServiceIdentifier } from "inversify";

export const PLATFORM = {
    Config: Symbol.for("investlab.platform.client.Config") as ServiceIdentifier<ClientConfig>,
    HttpClient: Symbol.for("investlab.platform.client.HttpClient") as ServiceIdentifier<HttpClient>,
    InvestlabApiClient: Symbol.for(
        "investlab.platform.client.InvestlabApiClient",
    ) as ServiceIdentifier<InvestlabApiClient>,
} as const;
