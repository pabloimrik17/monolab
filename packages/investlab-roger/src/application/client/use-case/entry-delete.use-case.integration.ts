import { beforeEach, describe, expect, it } from "vitest";
import { ROGER } from "#application/client/tokens.ts";
import { EntryNotFoundError } from "#domain/error/entry.error.ts";
import { AAPL, entryOf, givenRogerWith } from "#testing/client/given.ts";
import { container } from "#testing/client/vitest-integration-setup.ts";
import type { EntryDeleteUseCase } from "./entry-delete.use-case.ts";

describe("EntryDeleteUseCase", () => {
    let remove: EntryDeleteUseCase;
    beforeEach(() => {
        remove = container.get(ROGER.EntryDelete);
    });

    it("deletes an entry the service has", async () => {
        const { entry } = entryOf(AAPL);
        givenRogerWith({ entry, instrument: AAPL });

        const result = await remove.execute(entry.id);

        expect(result.isOk()).toBe(true);
    });

    it("refuses an entry the service does not have", async () => {
        givenRogerWith();

        const error = (await remove.execute(AAPL.id))._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(EntryNotFoundError);
    });
});
