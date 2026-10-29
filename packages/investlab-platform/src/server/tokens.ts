import type { HttpClient } from "../shared/http/http.client.ts";
import type { ServerConfig } from "./config/server.config.ts";
import type { Db } from "./db/pg.client.ts";
import type { ServiceIdentifier } from "inversify";
import type Redis from "ioredis";

export const PLATFORM = {
    Config: Symbol.for("investlab.platform.server.Config") as ServiceIdentifier<ServerConfig>,
    HttpClient: Symbol.for("investlab.platform.server.HttpClient") as ServiceIdentifier<HttpClient>,
    Db: Symbol.for("investlab.platform.server.Db") as ServiceIdentifier<Db>,
    Redis: Symbol.for("investlab.platform.server.Redis") as ServiceIdentifier<Redis>,
} as const;
