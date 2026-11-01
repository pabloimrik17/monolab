import { ContainerModule } from "inversify";
import { LocalStorage } from "#client/storage/local.storage.ts";
import { PLATFORM_SHARED } from "#shared/tokens.ts";

/** Binds nothing that needs `PLATFORM.Config`: the API token must never reach the browser. */
export const platformBrowserModule = new ContainerModule(({ bind }) => {
    bind(PLATFORM_SHARED.KeyValueStorage).to(LocalStorage).inSingletonScope();
});
