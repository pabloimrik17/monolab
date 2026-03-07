import { describe, expect, it } from "vitest";

import { SessionCode } from "./session-code.ts";

describe("SessionCode", () => {
    describe("generate", () => {
        it("generates a 6-character alphanumeric uppercase code", () => {
            const code = SessionCode.generate();
            expect(code.value).toMatch(/^[A-Z0-9]{6}$/);
        });

        it("generates different codes on successive calls", () => {
            const codes = new Set(Array.from({ length: 10 }, () => SessionCode.generate().value));
            expect(codes.size).toBeGreaterThan(1);
        });
    });

    describe("from", () => {
        it("accepts valid 6-char uppercase alphanumeric", () => {
            const result = SessionCode.from("ABC123");
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.value).toBe("ABC123");
            }
        });

        it("normalizes lowercase to uppercase", () => {
            const result = SessionCode.from("abc123");
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.value).toBe("ABC123");
            }
        });

        it("rejects codes shorter than 6 chars", () => {
            const result = SessionCode.from("ABC12");
            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
                expect(result.error.code).toBe("INVALID_CODE");
            }
        });

        it("rejects codes longer than 6 chars", () => {
            const result = SessionCode.from("ABC1234");
            expect(result.isErr()).toBe(true);
        });

        it("rejects codes with special characters", () => {
            const result = SessionCode.from("ABC12!");
            expect(result.isErr()).toBe(true);
        });

        it("rejects empty string", () => {
            const result = SessionCode.from("");
            expect(result.isErr()).toBe(true);
        });
    });

    describe("equals", () => {
        it("returns true for codes with same value", () => {
            const a = SessionCode.from("ABC123");
            const b = SessionCode.from("ABC123");
            if (a.isOk() && b.isOk()) {
                expect(a.value.equals(b.value)).toBe(true);
            }
        });

        it("returns false for different codes", () => {
            const a = SessionCode.from("ABC123");
            const b = SessionCode.from("XYZ789");
            if (a.isOk() && b.isOk()) {
                expect(a.value.equals(b.value)).toBe(false);
            }
        });
    });
});
