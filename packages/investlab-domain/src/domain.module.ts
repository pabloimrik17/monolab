import { ContainerModule } from "inversify";

export const domainModule = new ContainerModule(() => {
    // Domain module — no bindings needed yet (no use cases).
    // Repository and QuoteCache bindings live in data/infra modules.
});
