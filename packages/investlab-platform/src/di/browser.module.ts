import { ContainerModule } from "inversify";
import { LocalStorage } from "#client/storage/local.storage.ts";
import { PLATFORM_SHARED } from "#shared/tokens.ts";

/** Browser-only bindings; nothing here needs `PLATFORM.Config`, so the API token never reaches the browser. */
export const platformBrowserModule = new ContainerModule(({ bind }) => {
    bind(PLATFORM_SHARED.KeyValueStorage).to(LocalStorage).inSingletonScope();
});
