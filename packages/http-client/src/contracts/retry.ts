/**
 * HTTP retry configuration and strategies.
 * @module
 */

import type { HttpError } from "./errors.js";

/**
 * Default retry condition function type.
 * Returns true if the request should be retried based on the error.
 *
 * @public
 */
export type HttpRetryCondition = (error: HttpError) => boolean;

/**
 * Retry delay function type.
 * Returns the delay in milliseconds before the next retry attempt.
 *
 * @param attempt - The current retry attempt number (1-indexed)
 * @param error - The error that caused the retry
 * @returns Delay in milliseconds
 * @public
 */
export type HttpRetryDelay = (attempt: number, error: HttpError) => number;

/**
 * Retry lifecycle hook called before each retry attempt.
 *
 * @param error - The error that triggered the retry
 * @param attempt - The current retry attempt number (1-indexed)
 * @public
 */
export type HttpRetryHook = (error: HttpError, attempt: number) => void;

/**
 * Retry failed hook called when all retry attempts are exhausted.
 *
 * @param error - The final error after all retries failed
 * @public
 */
export type HttpRetryFailedHook = (error: HttpError) => void;

/**
 * Retry configuration for HTTP requests.
 * Defines how many times to retry on failure and with what strategy.
 *
 * @public
 * @example
 * ```ts
 * const retryConfig: HttpRetryConfig = {
 *   attempts: 3,
 *   delay: 1000,
 *   condition: (error) => {
 *     // Retry on network errors and 5xx server errors
 *     return error instanceof HttpNetworkError ||
 *            (error instanceof HttpResponseError && error.status >= 500);
 *   },
 *   onRetry: (error, attempt) => {
 *     console.log(`Retrying request (attempt ${attempt}):`, error.message);
 *   },
 *   onRetryFailed: (error) => {
 *     console.error('All retry attempts failed:', error);
 *   },
 *   respectRetryAfter: true
 * };
 * ```
 */
export interface HttpRetryConfig {
    /**
     * Maximum number of retry attempts.
     *
     * @defaultValue 0 (no retries)
     * @example
     * ```ts
     * attempts: 3 // Retry up to 3 times
     * ```
     */
    readonly attempts: number;

    /**
     * Delay between retry attempts.
     * Can be a fixed delay in milliseconds or a function that calculates delay based on attempt number.
     *
     * @defaultValue 0 (immediate retry)
     * @example
     * ```ts
     * // Fixed delay
     * delay: 1000 // 1 second between retries
     *
     * // Dynamic delay with exponential backoff
     * delay: (attempt, error) => Math.min(1000 * Math.pow(2, attempt - 1), 10000)
     * ```
     */
    readonly delay: number | HttpRetryDelay;

    /**
     * Condition function to determine if the error should trigger a retry.
     * If not provided, default condition retries on network errors, 5xx errors, and 429.
     *
     * @example
     * ```ts
     * condition: (error) => {
     *   if (error instanceof HttpNetworkError) return true;
     *   if (error instanceof HttpResponseError) {
     *     return error.status >= 500 || error.status === 429;
     *   }
     *   return false;
     * }
     * ```
     */
    readonly condition?: HttpRetryCondition;

    /**
     * Hook called before each retry attempt.
     * Useful for logging or metrics.
     *
     * @example
     * ```ts
     * onRetry: (error, attempt) => {
     *   console.log(`Retrying request (attempt ${attempt}/${config.attempts})`);
     *   metrics.increment('http.retry', { status: error.status });
     * }
     * ```
     */
    readonly onRetry?: HttpRetryHook;

    /**
     * Hook called when all retry attempts are exhausted.
     * Useful for logging or alerting.
     *
     * @example
     * ```ts
     * onRetryFailed: (error) => {
     *   console.error('Request failed after all retries:', error);
     *   alerting.notify('HTTP request failed', error);
     * }
     * ```
     */
    readonly onRetryFailed?: HttpRetryFailedHook;

    /**
     * Whether to respect the `Retry-After` header from the server.
     * When true, the delay will be overridden by the `Retry-After` value for 429 and 503 responses.
     *
     * @defaultValue true
     * @example
     * ```ts
     * respectRetryAfter: true // Use server-provided retry delay
     * ```
     */
    readonly respectRetryAfter?: boolean;
}

/**
 * Exponential backoff delay strategy.
 * Delay doubles with each attempt: baseDelay, baseDelay * 2, baseDelay * 4, etc.
 *
 * @param baseDelay - Initial delay in milliseconds
 * @param maxDelay - Maximum delay cap in milliseconds (optional)
 * @returns Delay function for use in retry config
 * @public
 * @example
 * ```ts
 * const retry: HttpRetryConfig = {
 *   attempts: 5,
 *   delay: exponentialBackoff(1000, 30000) // Start at 1s, max 30s
 * };
 * ```
 */
export function exponentialBackoff(
    baseDelay: number,
    maxDelay?: number
): HttpRetryDelay {
    return (attempt: number): number => {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        return maxDelay ? Math.min(delay, maxDelay) : delay;
    };
}

/**
 * Linear backoff delay strategy.
 * Delay increases linearly with each attempt: baseDelay, baseDelay * 2, baseDelay * 3, etc.
 *
 * @param baseDelay - Base delay in milliseconds
 * @returns Delay function for use in retry config
 * @public
 * @example
 * ```ts
 * const retry: HttpRetryConfig = {
 *   attempts: 3,
 *   delay: linearBackoff(1000) // 1s, 2s, 3s
 * };
 * ```
 */
export function linearBackoff(baseDelay: number): HttpRetryDelay {
    return (attempt: number): number => baseDelay * attempt;
}

/**
 * Jittered backoff delay strategy.
 * Adds randomness to exponential backoff to prevent thundering herd.
 *
 * @param baseDelay - Initial delay in milliseconds
 * @param maxDelay - Maximum delay cap in milliseconds (optional)
 * @returns Delay function for use in retry config
 * @public
 * @example
 * ```ts
 * const retry: HttpRetryConfig = {
 *   attempts: 5,
 *   delay: jitterBackoff(1000, 30000)
 * };
 * ```
 */
export function jitterBackoff(
    baseDelay: number,
    maxDelay?: number
): HttpRetryDelay {
    return (attempt: number): number => {
        const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
        const cappedDelay = maxDelay
            ? Math.min(exponentialDelay, maxDelay)
            : exponentialDelay;
        // Add random jitter between 0 and cappedDelay
        return Math.random() * cappedDelay;
    };
}
