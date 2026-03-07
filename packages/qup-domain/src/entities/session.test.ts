import { describe, expect, it } from "vitest";

import { SessionCode } from "../value-objects/session-code.ts";
import { SessionStatus } from "../value-objects/session-status.ts";
import { Session } from "./session.ts";

describe("Session", () => {
    describe("create", () => {
        it("creates a session with OPEN status and generated code", () => {
            const result = Session.create({ name: "Coffee Run" });
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                const session = result.value;
                expect(session.name).toBe("Coffee Run");
                expect(session.status).toBe(SessionStatus.OPEN);
                expect(session.code.value).toMatch(/^[A-Z0-9]{6}$/);
                expect(session.id).toBeDefined();
                expect(session.createdAt).toBeInstanceOf(Date);
                expect(session.closedAt).toBeUndefined();
            }
        });

        it("trims the session name", () => {
            const result = Session.create({ name: "  Coffee Run  " });
            if (result.isOk()) {
                expect(result.value.name).toBe("Coffee Run");
            }
        });

        it("returns ValidationError for empty name", () => {
            const result = Session.create({ name: "" });
            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
                expect(result.error.code).toBe("VALIDATION_ERROR");
            }
        });

        it("returns ValidationError for whitespace-only name", () => {
            const result = Session.create({ name: "   " });
            expect(result.isErr()).toBe(true);
        });
    });

    describe("close", () => {
        it("closes an open session", () => {
            const session = Session.create({ name: "Test" });
            if (session.isOk()) {
                const result = session.value.close();
                expect(result.isOk()).toBe(true);
                expect(session.value.status).toBe(SessionStatus.CLOSED);
                expect(session.value.closedAt).toBeInstanceOf(Date);
            }
        });

        it("returns SessionAlreadyClosedError when closing a closed session", () => {
            const session = Session.create({ name: "Test" });
            if (session.isOk()) {
                session.value.close();
                const result = session.value.close();
                expect(result.isErr()).toBe(true);
                if (result.isErr()) {
                    expect(result.error.code).toBe("SESSION_ALREADY_CLOSED");
                }
            }
        });
    });

    describe("isOpen", () => {
        it("returns true for open session", () => {
            const session = Session.create({ name: "Test" });
            if (session.isOk()) {
                expect(session.value.isOpen()).toBe(true);
            }
        });

        it("returns false for closed session", () => {
            const session = Session.create({ name: "Test" });
            if (session.isOk()) {
                session.value.close();
                expect(session.value.isOpen()).toBe(false);
            }
        });
    });

    describe("reconstitute", () => {
        it("hydrates a session from raw props without validation", () => {
            const code = SessionCode.from("ABC123");
            if (code.isErr()) {
                throw new Error("unexpected");
            }
            const session = Session.reconstitute({
                id: "test-id",
                name: "Test",
                code: code.value,
                status: SessionStatus.CLOSED,
                createdAt: new Date("2024-01-01"),
                closedAt: new Date("2024-01-02"),
            });
            expect(session.id).toBe("test-id");
            expect(session.status).toBe(SessionStatus.CLOSED);
            expect(session.closedAt).toEqual(new Date("2024-01-02"));
        });
    });
});
