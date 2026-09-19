import { createEffect, createSignal, Show } from "solid-js";
import { renderSVG } from "uqr";

// createEffect never runs during SSR, so the QR simply doesn't exist server-side —
// `window.location.origin` is only touched once mounted in the browser.
export function SessionQr(props: { code: string }) {
    const [svg, setSvg] = createSignal<string | undefined>(undefined);

    createEffect(() => {
        const joinUrl = `${window.location.origin}/session/${props.code}`;
        setSvg(renderSVG(joinUrl, { pixelSize: 6, border: 1 }));
    });

    return (
        <Show when={svg()}>
            {(markup) => (
                <div
                    class="hidden lg:block w-28 h-28 [&>svg]:w-full [&>svg]:h-full"
                    role="img"
                    aria-label="QR code to join this session"
                    // uqr encodes the join URL into QR modules (rects/paths only, no text
                    // nodes), so this never reflects raw input back into the DOM.
                    innerHTML={markup()}
                />
            )}
        </Show>
    );
}
