import { okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { Session } from "../entities/session.ts";
import { GetSessionByCodeUseCase } from "./get-session-by-code.use-case.ts";
import type { SessionRepository } from "../ports/session.repository.ts";

describe("GetSessionByCodeUseCase", () => {
    it("returns session for valid code", async () => {
        const session = Session.create({ name: "Test" });
        if (session.isErr()) {
            throw new Error("unexpected");
        }

        const mockSessionRepo: SessionRepository = {
            save: vi.fn(),
            findByCode: vi.fn(() => okAsync(session.value)),
            findById: vi.fn(),
            updateStatus: vi.fn(),
        };

        const useCase = new GetSessionByCodeUseCase(mockSessionRepo);
        const result = await useCase.execute(session.value.code.value);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
            expect(result.value.id).toBe(session.value.id);
        }
    });

    it("returns InvalidCodeError for bad format", async () => {
        const mockSessionRepo: SessionRepository = {
            save: vi.fn(),
            findByCode: vi.fn(),
            findById: vi.fn(),
            updateStatus: vi.fn(),
        };

        const useCase = new GetSessionByCodeUseCase(mockSessionRepo);
        const result = await useCase.execute("bad!");

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect(result.error.code).toBe("INVALID_CODE");
        }
    });

    it("returns SessionNotFoundError when not found", async () => {
        const mockSessionRepo: SessionRepository = {
            save: vi.fn(),
            findByCode: vi.fn(() => okAsync(null)),
            findById: vi.fn(),
            updateStatus: vi.fn(),
        };

        const useCase = new GetSessionByCodeUseCase(mockSessionRepo);
        const result = await useCase.execute("ABC123");

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect(result.error.code).toBe("SESSION_NOT_FOUND");
        }
    });
});
