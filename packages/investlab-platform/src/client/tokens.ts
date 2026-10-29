import type { HttpClient } from "../shared/http/http.client.ts";
import type { KeyValueStorage } from "../shared/storage/key-value.storage.ts";
import type { ClientConfig } from "./config/client.config.ts";
import type { InvestlabApiClient } from "./http/investlab-api.client.ts";
import type { ServiceIdentifier } from "inversify";

export const PLATFORM = {
    Config: Symbol.for("investlab.platform.client.Config") as ServiceIdentifier<ClientConfig>,
    HttpClient: Symbol.for("investlab.platform.client.HttpClient") as ServiceIdentifier<HttpClient>,
    InvestlabApiClient: Symbol.for(
        "investlab.platform.client.InvestlabApiClient",
    ) as ServiceIdentifier<InvestlabApiClient>,
    KeyValueStorage: Symbol.for(
        "investlab.platform.client.KeyValueStorage",
    ) as ServiceIdentifier<KeyValueStorage>,
} as const;
