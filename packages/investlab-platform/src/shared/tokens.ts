import type { KeyValueStorage } from "#shared/storage/key-value.storage.ts";
import type { ServiceIdentifier } from "inversify";

export const PLATFORM_SHARED = {
    KeyValueStorage: Symbol.for(
        "investlab.platform.shared.KeyValueStorage",
    ) as ServiceIdentifier<KeyValueStorage>,
} as const;
