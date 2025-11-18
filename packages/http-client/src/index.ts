/**
 * @m0n0lab/http-client
 *
 * Abstracted HTTP client for web and Node.js environments.
 *
 * This package provides a foundation for HTTP client functionality.
 * Full implementation including neverthrow and effect-ts wrappers will be added in future releases.
 *
 * @packageDocumentation
 */

/**
 * Placeholder constant indicating the package is in foundation stage.
 * @internal
 */
export const HTTP_CLIENT_VERSION = "0.1.0" as const;

/**
 * Placeholder type for future HTTP client configuration.
 * @public
 */
export type HttpClientConfig = {
    /** Base URL for HTTP requests */
    readonly baseUrl?: string;
};
