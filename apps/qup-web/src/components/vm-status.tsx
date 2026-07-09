import { Show } from "solid-js";
import type { Accessor } from "solid-js";

interface VmStatusProps {
    loading: Accessor<boolean>;
    error: Accessor<string>;
    centered?: boolean;
}

export function VmStatus(props: VmStatusProps) {
    return (
        <Show
            when={props.centered}
            fallback={
                <>
                    <Show when={props.error()}>
                        <p class="text-red-600">{props.error()}</p>
                    </Show>

                    <Show when={props.loading()}>
                        <p class="text-stone-500">Loading...</p>
                    </Show>
                </>
            }
        >
            <Show when={props.loading()}>
                <p class="text-center text-stone-500">Loading...</p>
            </Show>

            <Show when={props.error()}>
                <p class="text-center text-red-600">{props.error()}</p>
            </Show>
        </Show>
    );
}
