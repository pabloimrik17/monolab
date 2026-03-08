import { okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { Session } from "../entities/session.ts";
import { CloseSessionUseCase } from "./close-session.use-case.ts";
import type { EventBus } from "../ports/event-bus.ts";
import type { SessionRepository } from "../ports/session.repository.ts";

const createMocks = () => {
    const session = Session.create({ name: "Test" });
    if (session.isErr()) {
        throw new Error("unexpected");
    }

    const mockSessionRepo: SessionRepository = {
        save: vi.fn(),
        findByCode: vi.fn(),
        findById: vi.fn(() => okAsync(session.value)),
        updateStatus: vi.fn(() => okAsync(undefined)),
    };

    const mockEventBus: EventBus = {
        emit: vi.fn(),
        on: vi.fn(),
    };

    return { session: session.value, mockSessionRepo, mockEventBus };
};

describe("CloseSessionUseCase", () => {
    it("closes an open session and emits event", async () => {
        const { session, mockSessionRepo, mockEventBus } = createMocks();
        const useCase = new CloseSessionUseCase(mockSessionRepo, mockEventBus);

        const result = await useCase.execute(session.id);

        expect(result.isOk()).toBe(true);
        expect(mockSessionRepo.updateStatus).toHaveBeenCalled();
        expect(mockEventBus.emit).toHaveBeenCalledWith("session:closed", {
            sessionId: session.id,
        });
    });

    it("returns SessionNotFoundError for unknown id", async () => {
        const { mockEventBus } = createMocks();
        const mockSessionRepo: SessionRepository = {
            save: vi.fn(),
            findByCode: vi.fn(),
            findById: vi.fn(() => okAsync(null)),
            updateStatus: vi.fn(),
        };
        const useCase = new CloseSessionUseCase(mockSessionRepo, mockEventBus);

        const result = await useCase.execute("unknown-id");

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect(result.error.code).toBe("SESSION_NOT_FOUND");
        }
    });

    it("returns SessionAlreadyClosedError for closed session", async () => {
        const { session, mockEventBus } = createMocks();
        session.close();

        const mockSessionRepo: SessionRepository = {
            save: vi.fn(),
            findByCode: vi.fn(),
            findById: vi.fn(() => okAsync(session)),
            updateStatus: vi.fn(),
        };
        const useCase = new CloseSessionUseCase(mockSessionRepo, mockEventBus);

        const result = await useCase.execute(session.id);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect(result.error.code).toBe("SESSION_ALREADY_CLOSED");
        }
    });
});
