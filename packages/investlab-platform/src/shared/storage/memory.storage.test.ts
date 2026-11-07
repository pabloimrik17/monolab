import { describe, expect, it } from "vitest";
import { z } from "zod";
import { MemoryStorage } from "./memory.storage.ts";

const ANY = z.unknown();

describe("MemoryStorage", () => {
    it("round-trips text, numbers and objects", () => {
        const storage = new MemoryStorage();
        storage.set("text", "hello");
        storage.setNumber("number", 4.5);
        storage.setObject("object", [{ symbol: "AAPL" }]);

        expect(storage.get("text")).toBe("hello");
        expect(storage.getNumber("number")).toBe(4.5);
        expect(storage.getObject("object", ANY)).toEqual([{ symbol: "AAPL" }]);

        storage.remove("text");
        expect(storage.get("text")).toBeUndefined();
    });

    it("returns no value for a missing key or text the typed helper cannot read", () => {
        const storage = new MemoryStorage();
        storage.set("text", "not json {");

        expect(storage.get("missing")).toBeUndefined();
        expect(storage.getNumber("missing")).toBeUndefined();
        expect(storage.getObject("missing", ANY)).toBeUndefined();
        expect(storage.getNumber("text")).toBeUndefined();
        expect(storage.getObject("text", ANY)).toBeUndefined();
    });

    it("returns no value when the stored JSON does not match the schema", () => {
        const storage = new MemoryStorage();
        storage.setObject("object", { symbol: "AAPL" });

        expect(storage.getObject("object", z.array(z.string()))).toBeUndefined();
        expect(storage.getObject("object", z.object({ symbol: z.string() }))).toEqual({
            symbol: "AAPL",
        });
    });
});
