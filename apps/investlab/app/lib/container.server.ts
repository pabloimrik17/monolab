import { Container } from "inversify";
import { applicationClientModule } from "@m0n0lab/investlab-application-client";
import { DATA_CLIENT_TOKENS, dataClientModule } from "@m0n0lab/investlab-data-client";

interface WebEnv {
    readonly apiUrl: string;
    readonly apiToken: string;
}

const REQUIRED_VARS = ["INVESTLAB_API_URL", "INVESTLAB_API_TOKEN"] as const;

export function readWebEnv(env: Record<string, string | undefined>): WebEnv {
    const missing = REQUIRED_VARS.filter((name) => !env[name]);
    if (missing.length > 0) {
        throw new Error(`Missing env vars: ${missing.join(", ")}`);
    }
    return {
        apiUrl: env["INVESTLAB_API_URL"]!,
        apiToken: env["INVESTLAB_API_TOKEN"]!,
    };
}

export function createContainer({ apiUrl, apiToken }: WebEnv): Container {
    const container = new Container();

    container.bind(DATA_CLIENT_TOKENS.ApiBaseUrl).toConstantValue(apiUrl);
    container.bind(DATA_CLIENT_TOKENS.ApiToken).toConstantValue(apiToken);

    container.load(dataClientModule);
    container.load(applicationClientModule);

    return container;
}

let singleton: Container | null = null;

export function getContainer(): Container {
    if (singleton === null) {
        singleton = createContainer(readWebEnv(process.env));
    }
    return singleton;
}
