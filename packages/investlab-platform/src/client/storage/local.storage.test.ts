import { afterEach, describe, expect, it } from "vitest";
import { LocalStorage } from "./local.storage.ts";

describe("LocalStorage", () => {
    afterEach(() => {
        localStorage.clear();
    });

    it("round-trips through the browser's localStorage", () => {
        const storage = new LocalStorage();
        storage.set("text", "hello");
        storage.setNumber("number", 4.5);
        storage.setObject("object", { symbol: "AAPL" });

        expect(localStorage.getItem("text")).toBe("hello");
        expect(storage.getNumber("number")).toBe(4.5);
        expect(storage.getObject("object")).toEqual({ symbol: "AAPL" });

        storage.remove("text");
        expect(storage.get("text")).toBeUndefined();
    });

    it("returns no value for a missing key or text the typed helper cannot read", () => {
        const storage = new LocalStorage();
        localStorage.setItem("text", "not json {");

        expect(storage.getNumber("missing")).toBeUndefined();
        expect(storage.getNumber("text")).toBeUndefined();
        expect(storage.getObject("text")).toBeUndefined();
    });
});
