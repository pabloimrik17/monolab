import { expectTypeOf } from "vitest";
import { useDidMount } from "./use-did-mount.hook.js";

// Test function signature
expectTypeOf(useDidMount).toBeFunction();
expectTypeOf(useDidMount).returns.toBeVoid();

// Test parameter accepts sync callback
expectTypeOf(useDidMount).parameter(0).toMatchTypeOf<() => void>();

// Test parameter accepts async callback
expectTypeOf(useDidMount).parameter(0).toMatchTypeOf<() => Promise<void>>();

// Test that invalid callbacks are rejected
// @ts-expect-error - callback should not return string
useDidMount(() => "invalid");

// @ts-expect-error - callback should not return number
useDidMount(() => 42);

// @ts-expect-error - should not accept callback with parameters
useDidMount((_value: number) => {});

// Test valid usage
expectTypeOf(
    useDidMount(() => {
        console.log("mounted");
    }),
).toBeVoid();

expectTypeOf(
    useDidMount(async () => {
        await Promise.resolve();
    }),
).toBeVoid();
