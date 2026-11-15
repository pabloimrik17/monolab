// Browser-only: SSE connects straight to qup-api. Without VITE_API_URL, assume the API
// runs on the same host as the page, so phones on the LAN reach it through the host's IP.
function apiOrigin(): string {
    return (
        (import.meta.env?.["VITE_API_URL"] as string | undefined) ??
        `${window.location.protocol}//${window.location.hostname}:3001`
    );
}

export function sessionEventsUrl(sessionCode: string): string {
    return `${apiOrigin()}/events/sessions/${encodeURIComponent(sessionCode)}`;
}

// The board listens on its own payload-free stream rather than the per-order one.
export function boardEventsUrl(sessionCode: string): string {
    return `${sessionEventsUrl(sessionCode)}/board`;
}
