/** Web settings grouped by concern; keys of `apps/investlab/.env.schema` in the comments. */
export interface ClientConfig {
    readonly api: { readonly baseUrl: string; readonly token: string }; // INVESTLAB_API_URL, INVESTLAB_API_TOKEN
}
