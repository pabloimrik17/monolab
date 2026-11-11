import { errAsync, okAsync } from "neverthrow";
import { TOKENS } from "@m0n0lab/qup-domain";
import { ApiHarness, type UseCaseError } from "../harness/api.harness.ts";
import type {
    CreateMenuItemUseCase,
    DeleteMenuItemUseCase,
    GetMenuUseCase,
    MenuItem,
    UpdateMenuItemUseCase,
} from "@m0n0lab/qup-domain";
import type { MenuItemDto } from "@m0n0lab/qup-shared";

export class MenuRouteHarness extends ApiHarness {
    givenMenu(items: MenuItem[]) {
        return this.fake<GetMenuUseCase>(TOKENS.GetMenuUseCase, okAsync(items));
    }

    givenMenuFails(error: UseCaseError<GetMenuUseCase>) {
        return this.fake<GetMenuUseCase>(TOKENS.GetMenuUseCase, errAsync(error));
    }

    givenItemCreated(item: MenuItem) {
        return this.fake<CreateMenuItemUseCase>(TOKENS.CreateMenuItemUseCase, okAsync(item));
    }

    givenCreateFails(error: UseCaseError<CreateMenuItemUseCase>) {
        return this.fake<CreateMenuItemUseCase>(TOKENS.CreateMenuItemUseCase, errAsync(error));
    }

    givenItemUpdated() {
        return this.fake<UpdateMenuItemUseCase>(TOKENS.UpdateMenuItemUseCase, okAsync(undefined));
    }

    givenUpdateFails(error: UseCaseError<UpdateMenuItemUseCase>) {
        return this.fake<UpdateMenuItemUseCase>(TOKENS.UpdateMenuItemUseCase, errAsync(error));
    }

    givenItemDeleted() {
        return this.fake<DeleteMenuItemUseCase>(TOKENS.DeleteMenuItemUseCase, okAsync(undefined));
    }

    givenDeleteFails(error: UseCaseError<DeleteMenuItemUseCase>) {
        return this.fake<DeleteMenuItemUseCase>(TOKENS.DeleteMenuItemUseCase, errAsync(error));
    }

    /** `query` is the raw search string, `?available=true` or empty. */
    menu(query = "") {
        return this.reply<MenuItemDto[]>(this.request(`/menu${query}`));
    }

    createItem(body: unknown) {
        return this.reply<MenuItemDto>(this.adminJson("/menu", "POST", body));
    }

    updateItem(id: string, body: unknown) {
        return this.reply<{ ok: boolean }>(this.adminJson(`/menu/${id}`, "PATCH", body));
    }

    deleteItem(id: string) {
        return this.reply<undefined>(this.admin(`/menu/${id}`, { method: "DELETE" }));
    }
}
