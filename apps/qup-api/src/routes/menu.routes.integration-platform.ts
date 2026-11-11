import { describe, expect, it } from "vitest";
import {
    Category,
    MenuItemNotFoundError,
    PersistenceError,
    ValidationError,
} from "@m0n0lab/qup-domain";
import { makeMenuItem } from "../harness/builders.ts";
import { MenuRouteHarness } from "./menu.routes.harness.ts";

const ITEM_ID = "6b3389b3-bff8-416e-93ad-e6d411808d95";

describe("menuRoutes", () => {
    describe("admin menu routes", () => {
        it("reject a request without the admin PIN before reaching a use case", async () => {
            await using api = await MenuRouteHarness.launch();

            const responses = await Promise.all([
                api.anonymous("/menu", { method: "POST" }),
                api.anonymous(`/menu/${ITEM_ID}`, { method: "PATCH" }),
                api.anonymous(`/menu/${ITEM_ID}`, { method: "DELETE" }),
            ]);

            expect(responses.map((r) => r.status)).toEqual([401, 401, 401]);
        });
    });

    describe("GET /menu", () => {
        it("lists the whole menu as DTOs", async () => {
            await using api = await MenuRouteHarness.launch();
            const item = makeMenuItem({ description: "double shot", sortOrder: 3 });
            const plain = makeMenuItem({ name: "Rooibos", category: Category.TEA });
            const menu = api.givenMenu([item, plain]);

            const { status, body } = await api.menu();

            expect(status).toBe(200);
            expect(body).toEqual([
                {
                    id: item.id,
                    name: "Flat white",
                    category: "COFFEE",
                    description: "double shot",
                    available: true,
                    sortOrder: 3,
                },
                expect.objectContaining({ name: "Rooibos", category: "TEA", description: null }),
            ]);
            expect(menu.calls).toEqual([[undefined]]);
        });

        it("asks only for available items when available=true", async () => {
            await using api = await MenuRouteHarness.launch();
            const menu = api.givenMenu([]);

            const { status } = await api.menu("?available=true");

            expect(status).toBe(200);
            expect(menu.calls).toEqual([[{ availableOnly: true }]]);
        });

        it("answers a hidden 500 when the store fails", async () => {
            await using api = await MenuRouteHarness.launch();
            api.givenMenuFails(new PersistenceError(new Error("db down")));

            const { status, body } = await api.menu();

            expect(status).toBe(500);
            expect(body).toMatchObject({ code: "PERSISTENCE_ERROR" });
        });
    });

    describe("POST /menu", () => {
        it("creates an item from the whole body and answers 201 with its DTO", async () => {
            await using api = await MenuRouteHarness.launch();
            const item = makeMenuItem({ description: "double shot", sortOrder: 3 });
            const create = api.givenItemCreated(item);

            const { status, body } = await api.createItem({
                name: "Flat white",
                category: "COFFEE",
                description: "double shot",
                sortOrder: 3,
            });

            expect(status).toBe(201);
            expect(body).toMatchObject({ id: item.id, sortOrder: 3 });
            expect(create.calls).toStrictEqual([
                [
                    {
                        name: "Flat white",
                        category: Category.COFFEE,
                        description: "double shot",
                        sortOrder: 3,
                    },
                ],
            ]);
        });

        it("passes only the fields the body carries", async () => {
            await using api = await MenuRouteHarness.launch();
            const create = api.givenItemCreated(makeMenuItem());

            await api.createItem({ name: "Flat white", category: "COFFEE" });

            expect(create.calls).toStrictEqual([
                [{ name: "Flat white", category: Category.COFFEE }],
            ]);
        });

        it("answers 422 VALIDATION_ERROR for an item the domain rejects", async () => {
            await using api = await MenuRouteHarness.launch();
            api.givenCreateFails(new ValidationError("Menu item name is required"));

            const { status, body } = await api.createItem({ name: "", category: "COFFEE" });

            expect(status).toBe(422);
            expect(body).toMatchObject({ code: "VALIDATION_ERROR" });
        });
    });

    describe("PATCH /menu/:id", () => {
        it("passes every field the body sets", async () => {
            await using api = await MenuRouteHarness.launch();
            const update = api.givenItemUpdated();
            const changes = {
                name: "Cortado",
                category: "OTHER",
                description: "small",
                available: false,
                sortOrder: 1,
            };

            const { status, body } = await api.updateItem(ITEM_ID, changes);

            expect(status).toBe(200);
            expect(body).toEqual({ ok: true });
            expect(update.calls).toStrictEqual([[ITEM_ID, changes]]);
        });

        it("passes no field the body leaves out", async () => {
            await using api = await MenuRouteHarness.launch();
            const update = api.givenItemUpdated();

            await api.updateItem(ITEM_ID, { available: true });

            expect(update.calls).toStrictEqual([[ITEM_ID, { available: true }]]);
        });

        it("answers 404 MENU_ITEM_NOT_FOUND for an unknown item", async () => {
            await using api = await MenuRouteHarness.launch();
            api.givenUpdateFails(new MenuItemNotFoundError(ITEM_ID));

            const { status, body } = await api.updateItem(ITEM_ID, { name: "Cortado" });

            expect(status).toBe(404);
            expect(body).toMatchObject({ code: "MENU_ITEM_NOT_FOUND" });
        });
    });

    describe("DELETE /menu/:id", () => {
        it("deletes the item and answers 204 without a body", async () => {
            await using api = await MenuRouteHarness.launch();
            const remove = api.givenItemDeleted();

            const { status, body } = await api.deleteItem(ITEM_ID);

            expect(status).toBe(204);
            expect(body).toBeUndefined();
            expect(remove.calls).toEqual([[ITEM_ID]]);
        });

        it("answers 404 MENU_ITEM_NOT_FOUND for an unknown item", async () => {
            await using api = await MenuRouteHarness.launch();
            api.givenDeleteFails(new MenuItemNotFoundError(ITEM_ID));

            const { status, body } = await api.deleteItem(ITEM_ID);

            expect(status).toBe(404);
            expect(body).toMatchObject({ code: "MENU_ITEM_NOT_FOUND" });
        });
    });
});
