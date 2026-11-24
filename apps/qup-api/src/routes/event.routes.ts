import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { type EventBus, type GetSessionByCodeUseCase, TOKENS } from "@m0n0lab/qup-domain";
import { errorJson } from "../errors/error-mapping.ts";
import type { Context } from "hono";
import type { SSEMessage, SSEStreamingApi } from "hono/streaming";
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

// Returning null drops the event instead of writing a frame for it.
type ToFrame = (event: string, payload: Record<string, unknown>) => SSEMessage | null;

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

function sessionStream(container: Container, events: readonly string[], toFrame: ToFrame) {
    return async (c: Context): Promise<Response> => {
        const getSession = container.get<GetSessionByCodeUseCase>(TOKENS.GetSessionByCodeUseCase);
        // The route pattern guarantees the param.
        const sessionResult = await getSession.execute(c.req.param("code")!);

        if (sessionResult.isErr()) {
            return errorJson(c, sessionResult.error);
        }

        const sessionId = sessionResult.value.id;
        const eventBus = container.get<EventBus>(TOKENS.EventBus);

        return streamSSE(c, async (stream) => {
            const release = subscribeForSession(eventBus, sessionId, events, (event, payload) => {
                const frame = toFrame(event, payload);
                if (frame) {
                    void stream.writeSSE(frame);
                }
            });

            stream.onAbort(release);
            await keepAlive(stream);
            release();
        });
    };
}

export function eventRoutes(container: Container) {
    const app = new Hono();

    // No PIN and no serializer: payloads go out verbatim, so the bus must only carry flat
    // signal records for these events (see `@m0n0lab/qup-shared`), never entities.
    app.get(
        "/sessions/:code",
        sessionStream(container, SESSION_STREAM_EVENTS, (event, data) => ({
            event,
            data: JSON.stringify(data),
        })),
    );

    // No PIN: the session code is the only key.
    app.get(
        "/sessions/:code/board",
        sessionStream(container, [...BOARD_SIGNALS.keys()], (event) => {
            // Empty by construction: a stream that never builds a payload cannot leak one.
            const signal = BOARD_SIGNALS.get(event);
            return signal ? { event: signal, data: "" } : null;
        }),
    );

    return app;
}
