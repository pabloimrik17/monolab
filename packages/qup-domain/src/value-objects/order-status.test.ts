import { describe, expect, it } from "vitest";
import { OrderStatus } from "./order-status.ts";

describe("OrderStatus", () => {
    describe("canTransitionTo", () => {
        it("allows PENDING -> PREPARING", () => {
            expect(OrderStatus.PENDING.canTransitionTo(OrderStatus.PREPARING)).toBe(true);
        });

        it("allows PENDING -> CANCELLED", () => {
            expect(OrderStatus.PENDING.canTransitionTo(OrderStatus.CANCELLED)).toBe(true);
        });

        it("allows PREPARING -> DONE", () => {
            expect(OrderStatus.PREPARING.canTransitionTo(OrderStatus.DONE)).toBe(true);
        });

        it("disallows PENDING -> DONE", () => {
            expect(OrderStatus.PENDING.canTransitionTo(OrderStatus.DONE)).toBe(false);
        });

        it("disallows PREPARING -> CANCELLED", () => {
            expect(OrderStatus.PREPARING.canTransitionTo(OrderStatus.CANCELLED)).toBe(false);
        });

        it("disallows DONE -> any", () => {
            expect(OrderStatus.DONE.canTransitionTo(OrderStatus.PENDING)).toBe(false);
            expect(OrderStatus.DONE.canTransitionTo(OrderStatus.PREPARING)).toBe(false);
            expect(OrderStatus.DONE.canTransitionTo(OrderStatus.CANCELLED)).toBe(false);
        });

        it("disallows CANCELLED -> any", () => {
            expect(OrderStatus.CANCELLED.canTransitionTo(OrderStatus.PENDING)).toBe(false);
            expect(OrderStatus.CANCELLED.canTransitionTo(OrderStatus.DONE)).toBe(false);
        });
    });

    describe("transitionTo", () => {
        it("returns ok for valid transition", () => {
            const result = OrderStatus.PENDING.transitionTo(OrderStatus.PREPARING);
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.equals(OrderStatus.PREPARING)).toBe(true);
            }
        });

        it("returns err for invalid transition", () => {
            const result = OrderStatus.DONE.transitionTo(OrderStatus.PENDING);
            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
                expect(result.error.code).toBe("INVALID_TRANSITION");
            }
        });
    });

    describe("from", () => {
        it("parses valid status strings", () => {
            expect(OrderStatus.from("PENDING").equals(OrderStatus.PENDING)).toBe(true);
            expect(OrderStatus.from("PREPARING").equals(OrderStatus.PREPARING)).toBe(true);
            expect(OrderStatus.from("DONE").equals(OrderStatus.DONE)).toBe(true);
            expect(OrderStatus.from("CANCELLED").equals(OrderStatus.CANCELLED)).toBe(true);
        });

        it("throws for unknown status", () => {
            expect(() => OrderStatus.from("INVALID")).toThrow();
        });
    });

    describe("equals", () => {
        it("returns true for same status", () => {
            expect(OrderStatus.PENDING.equals(OrderStatus.PENDING)).toBe(true);
        });

        it("returns false for different status", () => {
            expect(OrderStatus.PENDING.equals(OrderStatus.DONE)).toBe(false);
        });
    });
});
