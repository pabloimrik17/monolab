import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import type { HttpDeduplicationConfig } from "../contracts/deduplication.js";

/**
 * Generate a deduplication key for a request.
 * Key format: METHOD:URL:PARAMS:BODY:HEADERS
 */
export function generateDeduplicationKey(
    config: AxiosRequestConfig,
    criticalHeaders?: string[]
): string {
    const parts: string[] = [];

    // Method
    parts.push((config.method || "GET").toUpperCase());

    // URL
    parts.push(config.url || "");

    // Query params (sorted for consistency)
    if (config.params) {
        const sortedParams = Object.keys(config.params)
            .sort()
            .map((key) => `${key}=${JSON.stringify(config.params[key])}`)
            .join("&");
        parts.push(sortedParams);
    } else {
        parts.push("");
    }

    // Body (for POST/PUT/PATCH)
    if (config.data) {
        parts.push(
            typeof config.data === "string"
                ? config.data
                : JSON.stringify(config.data)
        );
    } else {
        parts.push("");
    }

    // Critical headers (if specified)
    if (criticalHeaders && criticalHeaders.length > 0 && config.headers) {
        const headerValues = criticalHeaders
            .sort()
            .map((header) => {
                const value = config.headers?.[header];
                return `${header}:${value || ""}`;
            })
            .join("|");
        parts.push(headerValues);
    } else {
        parts.push("");
    }

    return parts.join("::");
}

/**
 * Deduplication manager for concurrent identical requests.
 * Ensures only one actual request is made for multiple identical concurrent requests.
 */
export class DeduplicationManager {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private inFlightRequests = new Map<
        string,
        Promise<AxiosResponse<any>>
    >();
    private readonly criticalHeaders?: string[];

    constructor(config?: HttpDeduplicationConfig) {
        if (config?.criticalHeaders) {
            this.criticalHeaders = config.criticalHeaders;
        }
    }

    /**
     * Wrap a request with deduplication logic.
     * If an identical request is in flight, return the existing promise.
     * Otherwise, execute the request and cache the promise.
     */
    async deduplicate<T>(
        config: AxiosRequestConfig,
        executeRequest: () => Promise<AxiosResponse<T>>
    ): Promise<AxiosResponse<T>> {
        const key = generateDeduplicationKey(config, this.criticalHeaders);

        // Check if identical request is in flight
        const existingRequest = this.inFlightRequests.get(key);
        if (existingRequest) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return existingRequest as Promise<AxiosResponse<T>>;
        }

        // Execute new request
        const requestPromise = executeRequest();

        // Cache the promise
        this.inFlightRequests.set(key, requestPromise);

        // Clean up on completion (success or failure)
        try {
            const response = await requestPromise;
            this.inFlightRequests.delete(key);
            return response;
        } catch (error) {
            this.inFlightRequests.delete(key);
            throw error;
        }
    }

    /**
     * Clear all in-flight request cache.
     */
    clear(): void {
        this.inFlightRequests.clear();
    }
}

/**
 * Setup deduplication interceptor for an axios instance.
 */
export function setupDeduplication(
    axios: AxiosInstance,
    config: HttpDeduplicationConfig
): DeduplicationManager {
    const manager = new DeduplicationManager(config);

    // Store original HTTP methods
    const originalGet = axios.get.bind(axios);
    const originalPost = axios.post.bind(axios);
    const originalPut = axios.put.bind(axios);
    const originalPatch = axios.patch.bind(axios);
    const originalDelete = axios.delete.bind(axios);
    const originalHead = axios.head.bind(axios);
    const originalOptions = axios.options.bind(axios);

    // Wrap each HTTP method with deduplication
    (axios as any).get = async function (
        url: string,
        config?: AxiosRequestConfig
    ): Promise<AxiosResponse> {
        const requestConfig = { ...config, method: "GET", url };

        // Check if deduplication is disabled for this request
        if ((requestConfig as any).deduplication?.enabled === false) {
            return originalGet(url, config);
        }

        return manager.deduplicate(requestConfig, () =>
            originalGet(url, config)
        );
    };

    (axios as any).post = async function (
        url: string,
        data?: any,
        config?: AxiosRequestConfig
    ): Promise<AxiosResponse> {
        const requestConfig = { ...config, method: "POST", url, data };

        if ((requestConfig as any).deduplication?.enabled === false) {
            return originalPost(url, data, config);
        }

        return manager.deduplicate(requestConfig, () =>
            originalPost(url, data, config)
        );
    };

    (axios as any).put = async function (
        url: string,
        data?: any,
        config?: AxiosRequestConfig
    ): Promise<AxiosResponse> {
        const requestConfig = { ...config, method: "PUT", url, data };

        if ((requestConfig as any).deduplication?.enabled === false) {
            return originalPut(url, data, config);
        }

        return manager.deduplicate(requestConfig, () =>
            originalPut(url, data, config)
        );
    };

    (axios as any).patch = async function (
        url: string,
        data?: any,
        config?: AxiosRequestConfig
    ): Promise<AxiosResponse> {
        const requestConfig = { ...config, method: "PATCH", url, data };

        if ((requestConfig as any).deduplication?.enabled === false) {
            return originalPatch(url, data, config);
        }

        return manager.deduplicate(requestConfig, () =>
            originalPatch(url, data, config)
        );
    };

    (axios as any).delete = async function (
        url: string,
        config?: AxiosRequestConfig
    ): Promise<AxiosResponse> {
        const requestConfig = { ...config, method: "DELETE", url };

        if ((requestConfig as any).deduplication?.enabled === false) {
            return originalDelete(url, config);
        }

        return manager.deduplicate(requestConfig, () =>
            originalDelete(url, config)
        );
    };

    (axios as any).head = async function (
        url: string,
        config?: AxiosRequestConfig
    ): Promise<AxiosResponse> {
        const requestConfig = { ...config, method: "HEAD", url };

        if ((requestConfig as any).deduplication?.enabled === false) {
            return originalHead(url, config);
        }

        return manager.deduplicate(requestConfig, () =>
            originalHead(url, config)
        );
    };

    (axios as any).options = async function (
        url: string,
        config?: AxiosRequestConfig
    ): Promise<AxiosResponse> {
        const requestConfig = { ...config, method: "OPTIONS", url };

        if ((requestConfig as any).deduplication?.enabled === false) {
            return originalOptions(url, config);
        }

        return manager.deduplicate(requestConfig, () =>
            originalOptions(url, config)
        );
    };

    return manager;
}
