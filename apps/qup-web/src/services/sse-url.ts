// Browser-only: SSE connects straight to qup-api. Without VITE_API_URL, assume the API
// runs on the same host as the page, so phones on the LAN reach it through the host's IP.
export function sessionEventsUrl(sessionCode: string): string {
    const base =
        (import.meta.env?.["VITE_API_URL"] as string | undefined) ??
        `${window.location.protocol}//${window.location.hostname}:3001`;
    return `${base}/events/sessions/${encodeURIComponent(sessionCode)}`;
}
