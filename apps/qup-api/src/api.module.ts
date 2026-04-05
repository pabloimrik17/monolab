import { ContainerModule } from "inversify";
import { TOKENS } from "@m0n0lab/qup-domain";
import { InMemoryEventBus } from "./services/event-bus.ts";

export const apiModule = new ContainerModule(({ bind }) => {
    bind(TOKENS.EventBus).to(InMemoryEventBus).inSingletonScope();
});
