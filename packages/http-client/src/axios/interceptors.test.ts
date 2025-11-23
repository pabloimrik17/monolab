import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import type { HttpClient } from "../contracts/client.js";
import { createAxiosHttpClient } from "./adapter.js";

describe("Interceptors", () => {
    let client: HttpClient;
    let mock: MockAdapter;

    beforeEach(() => {
        const axiosInstance = axios.create();
        mock = new MockAdapter(axiosInstance);
        client = createAxiosHttpClient({ axiosInstance });
    });

    afterEach(() => {
        mock.reset();
    });

    describe("Request interceptors", () => {
        it("adds authorization header via request interceptor", async () => {
            const token = "Bearer test-token";

            client.addRequestInterceptor((config) => {
                return {
                    ...config,
                    headers: {
                        ...config.headers,
                        Authorization: token,
                    },
                };
            });

            mock.onGet("/protected").reply(200, { data: "protected" });

            await client.get("/protected");

            expect(mock.history.get[0].headers?.Authorization).toBe(token);
        });

        it("executes multiple request interceptors in order", async () => {
            const order: number[] = [];

            client.addRequestInterceptor((config) => {
                order.push(1);
                return config;
            });

            client.addRequestInterceptor((config) => {
                order.push(2);
                return config;
            });

            client.addRequestInterceptor((config) => {
                order.push(3);
                return config;
            });

            mock.onGet("/test").reply(200);

            await client.get("/test");

            // NOTE: Axios executes request interceptors in LIFO order (last-in-first-out)
            // This is axios's design - later interceptors can wrap earlier ones
            expect(order).toEqual([3, 2, 1]);
        });

        it("allows request interceptor to modify multiple fields", async () => {
            client.addRequestInterceptor((config) => {
                return {
                    ...config,
                    headers: {
                        ...config.headers,
                        "X-Custom": "value",
                        "X-Timestamp": "123456",
                    },
                    timeout: 5000,
                };
            });

            mock.onGet("/test").reply(200);

            await client.get("/test");

            expect(mock.history.get[0].headers?.["X-Custom"]).toBe("value");
            expect(mock.history.get[0].headers?.["X-Timestamp"]).toBe("123456");
            expect(mock.history.get[0].timeout).toBe(5000);
        });

        it("handles async request interceptor", async () => {
            const fetchToken = async () => {
                return new Promise<string>((resolve) => {
                    setTimeout(() => resolve("async-token"), 10);
                });
            };

            client.addRequestInterceptor(async (config) => {
                const token = await fetchToken();
                return {
                    ...config,
                    headers: {
                        ...config.headers,
                        Authorization: token,
                    },
                };
            });

            mock.onGet("/test").reply(200);

            await client.get("/test");

            expect(mock.history.get[0].headers?.Authorization).toBe(
                "async-token"
            );
        });

        it("calls onRejected when request interceptor throws", async () => {
            let errorCaught = false;

            client.addRequestInterceptor(
                () => {
                    throw new Error("Request validation failed");
                },
                (error) => {
                    errorCaught = true;
                    throw error;
                }
            );

            mock.onGet("/test").reply(200);

            await expect(client.get("/test")).rejects.toThrow(
                "Request validation failed"
            );
            expect(errorCaught).toBe(true);
        });
    });

    describe("Response interceptors", () => {
        it("logs response via response interceptor", async () => {
            const logs: string[] = [];

            client.addResponseInterceptor((response) => {
                logs.push(`Response: ${response.status}`);
                return response;
            });

            mock.onGet("/users").reply(200, { data: "users" });

            await client.get("/users");

            expect(logs).toContain("Response: 200");
        });

        it("transforms response data via response interceptor", async () => {
            client.addResponseInterceptor((response) => {
                return {
                    ...response,
                    data: {
                        transformed: true,
                        original: response.data,
                    },
                };
            });

            mock.onGet("/users").reply(200, { name: "John" });

            const response = await client.get("/users");

            expect(response.data).toEqual({
                transformed: true,
                original: { name: "John" },
            });
        });

        it("executes multiple response interceptors in order", async () => {
            const order: number[] = [];

            client.addResponseInterceptor((response) => {
                order.push(1);
                return response;
            });

            client.addResponseInterceptor((response) => {
                order.push(2);
                return response;
            });

            client.addResponseInterceptor((response) => {
                order.push(3);
                return response;
            });

            mock.onGet("/test").reply(200);

            await client.get("/test");

            expect(order).toEqual([1, 2, 3]);
        });

        it("handles async response interceptor", async () => {
            client.addResponseInterceptor(async (response) => {
                await new Promise((resolve) => setTimeout(resolve, 10));
                return {
                    ...response,
                    data: { processed: true },
                };
            });

            mock.onGet("/test").reply(200, { original: true });

            const response = await client.get("/test");

            expect(response.data).toEqual({ processed: true });
        });

        it("converts 404 to success via response error interceptor", async () => {
            client.addResponseInterceptor(
                (response) => response,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (error: any) => {
                    // Error is transformed to HttpNotFoundError (status property, not response.status)
                    if (error.status === 404) {
                        return {
                            data: null,
                            status: 200,
                            statusText: "OK",
                            headers: {},
                            request: {},
                            url: "",
                            config: {},
                        };
                    }
                    throw error;
                }
            );

            mock.onGet("/nonexistent").reply(404);

            const response = await client.get("/nonexistent");

            expect(response.status).toBe(200);
            expect(response.data).toBeNull();
        });

        it("chains response data transformations", async () => {
            client.addResponseInterceptor((response) => {
                return {
                    ...response,
                    data: { step1: response.data },
                };
            });

            client.addResponseInterceptor((response) => {
                return {
                    ...response,
                    data: { step2: response.data },
                };
            });

            mock.onGet("/test").reply(200, { original: true });

            const response = await client.get("/test");

            expect(response.data).toEqual({
                step2: { step1: { original: true } },
            });
        });
    });

    describe("Interceptor removal", () => {
        it("removes request interceptor by handle", async () => {
            let interceptorCalled = false;

            const handle = client.addRequestInterceptor((config) => {
                interceptorCalled = true;
                return config;
            });

            client.removeInterceptor(handle);

            mock.onGet("/test").reply(200);
            await client.get("/test");

            expect(interceptorCalled).toBe(false);
        });

        it("removes response interceptor by handle", async () => {
            let interceptorCalled = false;

            const handle = client.addResponseInterceptor((response) => {
                interceptorCalled = true;
                return response;
            });

            client.removeInterceptor(handle);

            mock.onGet("/test").reply(200);
            await client.get("/test");

            expect(interceptorCalled).toBe(false);
        });

        it("allows removing the same interceptor twice safely", () => {
            const handle = client.addRequestInterceptor((config) => config);

            expect(() => {
                client.removeInterceptor(handle);
                client.removeInterceptor(handle);
            }).not.toThrow();
        });

        it("keeps other interceptors when one is removed", async () => {
            const calls: string[] = [];

            client.addRequestInterceptor((config) => {
                calls.push("first");
                return config;
            });

            const handle = client.addRequestInterceptor((config) => {
                calls.push("second");
                return config;
            });

            client.addRequestInterceptor((config) => {
                calls.push("third");
                return config;
            });

            client.removeInterceptor(handle);

            mock.onGet("/test").reply(200);
            await client.get("/test");

            // NOTE: Axios LIFO order - third executes first, then first
            expect(calls).toEqual(["third", "first"]);
            expect(calls).not.toContain("second");
        });
    });

    describe("Interceptor interactions", () => {
        it("request interceptor affects all HTTP methods", async () => {
            let callCount = 0;

            client.addRequestInterceptor((config) => {
                callCount++;
                return config;
            });

            mock.onGet("/test").reply(200);
            mock.onPost("/test").reply(200);
            mock.onPut("/test").reply(200);
            mock.onDelete("/test").reply(200);

            await client.get("/test");
            await client.post("/test");
            await client.put("/test");
            await client.delete("/test");

            expect(callCount).toBe(4);
        });

        it("response interceptor affects all HTTP methods", async () => {
            let callCount = 0;

            client.addResponseInterceptor((response) => {
                callCount++;
                return response;
            });

            mock.onGet("/test").reply(200);
            mock.onPost("/test").reply(200);
            mock.onPut("/test").reply(200);
            mock.onDelete("/test").reply(200);

            await client.get("/test");
            await client.post("/test");
            await client.put("/test");
            await client.delete("/test");

            expect(callCount).toBe(4);
        });

        it("preserves per-request config through interceptors", async () => {
            client.addRequestInterceptor((config) => {
                // Don't modify timeout
                return config;
            });

            mock.onGet("/test").reply(200);

            const response = await client.get("/test", { timeout: 9999 });

            expect(response.request.timeout).toBe(9999);
        });
    });
});
