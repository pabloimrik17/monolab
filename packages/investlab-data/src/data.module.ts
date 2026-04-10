import { ContainerModule } from "inversify";
import { TOKENS } from "@m0n0lab/investlab-domain";
import { PgInstrumentRepository } from "./repositories/pg-instrument.repository.ts";

export const dataModule = new ContainerModule(({ bind }) => {
    bind(TOKENS.InstrumentRepository).to(PgInstrumentRepository);
});
