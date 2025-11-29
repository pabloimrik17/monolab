import type { AxiosResponse } from "axios";
import type { HttpHeaders } from "../contracts/types.js";

/**
 * Utilities for normalizing Axios headers to HttpClient format.
 *
 * Axios can return headers in different formats depending on the context:
 * - AxiosHeaders object (with toJSON method) - newer Axios versions
 * - Plain object - older versions or already normalized
 *
 * @module
 */

/**
 * Normalize axios headers to HttpHeaders format.
 *
 * This function handles the various formats that Axios can return headers in,
 * converting them to a consistent plain object format compatible with HttpHeaders.
 *
 * @param headers - Axios headers from response or error (can be AxiosHeaders object or plain object)
 * @returns Normalized headers as plain object
 *
 * @example
 * ```typescript
 * const normalized = normalizeHeaders(response.headers);
 * // Returns: { 'content-type': 'application/json', ... }
 * ```
 */
export function normalizeHeaders(
    headers: AxiosResponse["headers"]
): HttpHeaders {
    if (!headers) return {};

    // Type guard: must be an object
    if (typeof headers !== "object" || headers === null) {
        return {};
    }

    // If it has a toJSON method (AxiosHeaders), convert it
    if ("toJSON" in headers && typeof headers.toJSON === "function") {
        return headers.toJSON() as HttpHeaders;
    }

    // If it's already a plain object without toJSON, return it
    return headers as HttpHeaders;
}
