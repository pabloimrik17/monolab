import { okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";

import type { Session } from "../entities/session.ts";
import type { EventBus } from "../ports/event-bus.ts";
import type { SessionRepository } from "../ports/session.repository.ts";
import { CreateSessionUseCase } from "./create-session.use-case.ts";

const mockSessionRepo: SessionRepository = {
    save: vi.fn((session: Session) => okAsync(session)),
    findByCode: vi.fn(),
    findById: vi.fn(),
    updateStatus: vi.fn(),
};

const mockEventBus: EventBus = {
    emit: vi.fn(),
    on: vi.fn(),
};

describe("CreateSessionUseCase", () => {
    it("creates and persists a session", async () => {
        const useCase = new CreateSessionUseCase(mockSessionRepo, mockEventBus);
        const result = await useCase.execute({ name: "Coffee Run" });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
            expect(result.value.name).toBe("Coffee Run");
            expect(mockSessionRepo.save).toHaveBeenCalledWith(result.value);
            expect(mockEventBus.emit).toHaveBeenCalledWith("session:created", {
                sessionId: result.value.id,
                code: result.value.code.value,
            });
        }
    });

    it("returns ValidationError for empty name", async () => {
        const useCase = new CreateSessionUseCase(mockSessionRepo, mockEventBus);
        const result = await useCase.execute({ name: "" });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect(result.error.code).toBe("VALIDATION_ERROR");
        }
    });
});
