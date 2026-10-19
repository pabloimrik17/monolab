import { describe, expect, it, vi } from "vitest";
import { InMemoryEventBus } from "./event-bus.ts";

describe("InMemoryEventBus", () => {
    it("delivers events to subscribers", () => {
        const bus = new InMemoryEventBus();
        const handler = vi.fn();

        bus.on("test", handler);
        bus.emit("test", { foo: 1 });

        expect(handler).toHaveBeenCalledWith({ foo: 1 });
    });

    it("unsubscribes when dispose is called", () => {
        const bus = new InMemoryEventBus();
        const handler = vi.fn();

        const dispose = bus.on("test", handler);
        dispose();
        bus.emit("test", { foo: 1 });

        expect(handler).not.toHaveBeenCalled();
    });

    it("supports multiple listeners on same event", () => {
        const bus = new InMemoryEventBus();
        const h1 = vi.fn();
        const h2 = vi.fn();

        bus.on("ev", h1);
        bus.on("ev", h2);
        bus.emit("ev", "data");

        expect(h1).toHaveBeenCalledWith("data");
        expect(h2).toHaveBeenCalledWith("data");
    });

    it("does not cross-fire between events", () => {
        const bus = new InMemoryEventBus();
        const handler = vi.fn();

        bus.on("a", handler);
        bus.emit("b", "data");

        expect(handler).not.toHaveBeenCalled();
    });
});
