/** API settings grouped by concern; keys of `apps/investlab-api/.env.schema` in the comments. */
export interface ServerConfig {
    readonly database: { readonly url: string }; // DATABASE_URL
    readonly redis: { readonly url: string }; // REDIS_URL
    readonly finnhub: { readonly apiKey: string }; // FINNHUB_API_KEY
    readonly api: { readonly port: number; readonly token: string }; // PORT, INVESTLAB_API_TOKEN
}
