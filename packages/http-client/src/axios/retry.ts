import type {
    AxiosError,
    AxiosInstance,
    InternalAxiosRequestConfig,
} from "axios";
import type { HttpError } from "../contracts/errors.js";
import type { HttpRetryConfig } from "../contracts/retry.js";
import { transformAxiosError } from "./errors.js";

/**
 * Retry state stored on the request config.
 * Matches the axios-retry library pattern.
 */
interface RetryState {
    retryCount: number;
}

/**
 * Extended axios request config with retry state.
 * Used internally to track retry attempts across interceptor calls.
 */
interface AxiosRequestConfigWithRetry extends InternalAxiosRequestConfig {
    "axios-retry"?: RetryState;
}

/**
 * Default retry condition - retries on network errors, 5xx, and 429
 */
function defaultRetryCondition(error: HttpError): boolean {
    // Network errors should be retried
    if (
        error.name === "HttpNetworkError" ||
        error.name === "HttpTimeoutError"
    ) {
        return true;
    }

    // Response errors with status codes
    if ("status" in error && typeof error.status === "number") {
        // Retry on 5xx server errors and 429 rate limit
        return error.status >= 500 || error.status === 429;
    }

    return false;
}

/**
 * Check if HTTP method is idempotent/safe
 */
function isIdempotentMethod(method?: string): boolean {
    if (!method) return false;
    const safeMethod = method.toUpperCase();
    return ["GET", "HEAD", "OPTIONS", "PUT", "DELETE"].includes(safeMethod);
}

/**
 * Parse Retry-After header value (seconds or HTTP date)
 */
function parseRetryAfter(retryAfter?: string): number | null {
    if (!retryAfter) return null;

    // If it's a number, treat as seconds
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
        return seconds * 1000; // Convert to milliseconds
    }

    // Try parsing as HTTP date
    const date = new Date(retryAfter);
    if (!isNaN(date.getTime())) {
        return Math.max(0, date.getTime() - Date.now());
    }

    return null;
}

/**
 * Setup retry logic for axios instance
 */
export function setupRetry(
    axios: AxiosInstance,
    config: HttpRetryConfig
): void {
    const {
        attempts,
        delay,
        condition = defaultRetryCondition,
        onRetry,
        onRetryFailed,
        respectRetryAfter = true,
    } = config;

    // Add response interceptor to handle retries
    axios.interceptors.response.use(
        undefined, // Don't intercept successful responses
        async (error: AxiosError) => {
            const axiosConfig = error.config;
            if (!axiosConfig) {
                return Promise.reject(error);
            }

            // Meta-programming: Store retry state on config object
            // We attach a custom property to the AxiosRequestConfig to track retry attempts.
            // This pattern matches the official axios-retry library implementation.
            const configWithRetry = axiosConfig as AxiosRequestConfigWithRetry;
            const retryState = configWithRetry["axios-retry"] ?? {
                retryCount: 0,
            };
            configWithRetry["axios-retry"] = retryState;

            // Check if we should retry
            const httpError = transformAxiosError(error, {});
            const shouldRetry =
                retryState.retryCount < attempts - 1 && // attempts includes original request
                isIdempotentMethod(axiosConfig.method) &&
                condition(httpError);

            if (!shouldRetry) {
                // No more retries
                if (retryState.retryCount > 0 && onRetryFailed) {
                    onRetryFailed(httpError);
                }
                return Promise.reject(error);
            }

            // Calculate delay
            retryState.retryCount++;
            let retryDelay: number;

            // Check for Retry-After header
            if (respectRetryAfter && error.response) {
                const retryAfter = error.response.headers["retry-after"];
                const retryAfterMs = parseRetryAfter(retryAfter);
                if (retryAfterMs !== null) {
                    retryDelay = retryAfterMs;
                } else {
                    // Use configured delay
                    retryDelay =
                        typeof delay === "function"
                            ? delay(retryState.retryCount, httpError)
                            : delay;
                }
            } else {
                // Use configured delay
                retryDelay =
                    typeof delay === "function"
                        ? delay(retryState.retryCount, httpError)
                        : delay;
            }

            // Call onRetry hook
            if (onRetry) {
                onRetry(httpError, retryState.retryCount);
            }

            // Wait for delay then retry
            await new Promise((resolve) => setTimeout(resolve, retryDelay));

            // Retry the request
            return axios(axiosConfig);
        }
    );
}
