import { describe, expect, it } from "vitest";
import { MemoryStorage } from "./memory.storage.ts";

describe("MemoryStorage", () => {
    it("round-trips text, numbers and objects", () => {
        const storage = new MemoryStorage();
        storage.set("text", "hello");
        storage.setNumber("number", 4.5);
        storage.setObject("object", [{ symbol: "AAPL" }]);

        expect(storage.get("text")).toBe("hello");
        expect(storage.getNumber("number")).toBe(4.5);
        expect(storage.getObject("object")).toEqual([{ symbol: "AAPL" }]);

        storage.remove("text");
        expect(storage.get("text")).toBeUndefined();
    });

    it("returns no value for a missing key or text the typed helper cannot read", () => {
        const storage = new MemoryStorage();
        storage.set("text", "not json {");

        expect(storage.get("missing")).toBeUndefined();
        expect(storage.getNumber("missing")).toBeUndefined();
        expect(storage.getObject("missing")).toBeUndefined();
        expect(storage.getNumber("text")).toBeUndefined();
        expect(storage.getObject("text")).toBeUndefined();
    });
});
