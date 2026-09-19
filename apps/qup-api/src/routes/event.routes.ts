import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { type EventBus, type GetSessionByCodeUseCase, Order, TOKENS } from "@m0n0lab/qup-domain";
import { errorJson } from "../errors/error-mapping.ts";
import { toOrderDto } from "../serializers/dto-serializers.ts";
import type { SSEStreamingApi } from "hono/streaming";
import type { Container } from "inversify";

const KEEPALIVE_MS = 30_000;

const SESSION_STREAM_EVENTS = [
    "order:created",
    "order:status",
    "order:cancelled",
    "session:closed",
] as const;

// The board is told that something changed and refetches the snapshot, so the three order
// events collapse into one name and nothing else about them survives onto the wire.
const BOARD_SIGNALS = new Map<string, string>([
    ["order:created", "board:changed"],
    ["order:status", "board:changed"],
    ["order:cancelled", "board:changed"],
    ["session:closed", "session:closed"],
]);

function subscribeForSession(
    eventBus: EventBus,
    sessionId: string,
    events: readonly string[],
    listener: (event: string, payload: Record<string, unknown>) => void,
): () => void {
    const disposers = events.map((event) =>
        eventBus.on(event, (payload: unknown) => {
            const data = payload as Record<string, unknown>;
            if (data["sessionId"] === sessionId) {
                listener(event, data);
            }
        }),
    );
    return () => {
        for (const dispose of disposers) {
            dispose();
        }
    };
}

// `StreamingApi.write` swallows its errors, so writing to a client that went away never
// throws: the loop has to watch the abort itself, and cut short the wait it is in, or it
// keeps a timer alive for a connection nobody is on.
async function keepAlive(stream: SSEStreamingApi): Promise<void> {
    const aborted = new Promise<void>((resolve) => {
        stream.onAbort(resolve);
    });
    while (!stream.aborted) {
        await stream.writeSSE({ event: "ping", data: "" });
        let wake: ReturnType<typeof setTimeout> | undefined;
        await Promise.race([
            aborted,
            new Promise<void>((resolve) => {
                wake = setTimeout(resolve, KEEPALIVE_MS);
            }),
        ]);
        clearTimeout(wake);
    }
}

function openSession(container: Container, code: string) {
    return container.get<GetSessionByCodeUseCase>(TOKENS.GetSessionByCodeUseCase).execute(code);
}

export function eventRoutes(container: Container) {
    const app = new Hono();

    // GET /events/sessions/:code — SSE filtered by session
    app.get("/sessions/:code", async (c) => {
        const sessionResult = await openSession(container, c.req.param("code"));

        if (sessionResult.isErr()) {
            return errorJson(c, sessionResult.error);
        }

        const sessionId = sessionResult.value.id;
        const eventBus = container.get<EventBus>(TOKENS.EventBus);

        return streamSSE(c, async (stream) => {
            const release = subscribeForSession(
                eventBus,
                sessionId,
                SESSION_STREAM_EVENTS,
                (event, data) => {
                    // Serialize Order entity to DTO for order:created
                    const serialized =
                        event === "order:created" && data["order"] instanceof Order
                            ? { ...data, order: toOrderDto(data["order"]) }
                            : data;
                    void stream.writeSSE({ event, data: JSON.stringify(serialized) });
                },
            );

            stream.onAbort(release);
            await keepAlive(stream);
            release();
        });
    });

    // GET /events/sessions/:code/board — payload-free signals for the public board.
    // No PIN: the session code is the only key, and 422/404/409 come from the same
    // code-scoped state machine every other public endpoint uses.
    app.get("/sessions/:code/board", async (c) => {
        const sessionResult = await openSession(container, c.req.param("code"));

        if (sessionResult.isErr()) {
            return errorJson(c, sessionResult.error);
        }

        const sessionId = sessionResult.value.id;
        const eventBus = container.get<EventBus>(TOKENS.EventBus);

        return streamSSE(c, async (stream) => {
            const release = subscribeForSession(
                eventBus,
                sessionId,
                [...BOARD_SIGNALS.keys()],
                (event) => {
                    // Empty by construction: a stream that never builds a payload cannot
                    // leak one, whatever the event that triggered it carried.
                    const signal = BOARD_SIGNALS.get(event);
                    if (signal) {
                        void stream.writeSSE({ event: signal, data: "" });
                    }
                },
            );

            stream.onAbort(release);
            await keepAlive(stream);
            release();
        });
    });

    return app;
}
