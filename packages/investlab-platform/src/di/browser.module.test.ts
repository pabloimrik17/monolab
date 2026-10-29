import { Container } from "inversify";
import { describe, expect, it } from "vitest";
import { LocalStorage } from "#client/storage/local.storage.ts";
import { PLATFORM } from "#client/tokens.ts";
import { platformBrowserModule } from "./browser.module.ts";

describe("platformBrowserModule", () => {
    it("resolves the localStorage implementation without a Config binding", () => {
        const container = new Container();
        container.load(platformBrowserModule);

        const storage = container.get(PLATFORM.KeyValueStorage);

        expect(storage).toBeInstanceOf(LocalStorage);
        expect(container.isBound(PLATFORM.Config)).toBe(false);
    });
});
