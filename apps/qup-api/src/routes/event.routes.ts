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

// Both streams are the same machine — resolve the session by code, subscribe to its events,
// release on disconnect — and differ only in the frame they put on the wire.
function sessionStream(container: Container, events: readonly string[], toFrame: ToFrame) {
    return async (c: Context): Promise<Response> => {
        const getSession = container.get<GetSessionByCodeUseCase>(TOKENS.GetSessionByCodeUseCase);
        // The route pattern guarantees the param; matches how the other routes read theirs.
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

    // GET /events/sessions/:code — SSE filtered by session. No PIN, so nothing private may
    // ride on it: every payload the bus carries for these events is already a flat signal
    // record (see the interfaces in `@m0n0lab/qup-shared`), no entity is ever emitted, and
    // this route has no serializer to turn one into a DTO even if one were.
    app.get(
        "/sessions/:code",
        sessionStream(container, SESSION_STREAM_EVENTS, (event, data) => ({
            event,
            data: JSON.stringify(data),
        })),
    );

    // GET /events/sessions/:code/board — payload-free signals for the public board.
    // No PIN: the session code is the only key, and 422/404/409 come from the same
    // code-scoped state machine every other public endpoint uses.
    app.get(
        "/sessions/:code/board",
        sessionStream(container, [...BOARD_SIGNALS.keys()], (event) => {
            // Empty by construction: a stream that never builds a payload cannot leak one,
            // whatever the event that triggered it carried.
            const signal = BOARD_SIGNALS.get(event);
            return signal ? { event: signal, data: "" } : null;
        }),
    );

    return app;
}
