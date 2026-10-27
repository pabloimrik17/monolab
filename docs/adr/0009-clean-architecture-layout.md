# Clean Architecture projects share one layout: layer, side, kind; concept-first names

In October 2026 we gave every Clean Architecture project in the monorepo (InvestLab, qup, green-beard) one layout for the inside of its packages and apps. [ADR 0007](./0007-investlab-package-per-module.md) had settled the package split, one package per module plus core, platform and database packages, but not what goes inside them. InvestLab improvised (`entities/`, `ports/`, a loose `errors.ts`, source-first names, app folders by technical role), qup still split layers into packages, green-beard's plan copied qup, and the layer lint knew only InvestLab's paths. The `clean-architecture-layout` change migrates InvestLab and holds the testable rules in its spec; terms follow the Workspace glossary ([docs/GLOSSARY.md](../GLOSSARY.md)). We take from Clean Architecture and DDD what fits, and add no layer or folder without a real job.

This ADR amends ADR 0007 (folder names inside a module package, `module.<side>.ts`) and [ADR 0004](./0004-investlab-datasources-and-read-queries.md) (when a mapper gets its own file). Package entries (`.`, `./server`, `./client`, `./testing`) do not change.

- **Packages hold layers; apps hold presentation.** A module package's `src/` holds `domain/`, `application/` and `data/`, plus `di/`, `testing/` and its entry files. An app's `src/` holds one folder per module, `core/` for what no module owns, `di/` and the framework's route tree, whose files only re-export a module's page, loader or action.
- **Layer, then side, then kind.** Domain has no side, application is `server/` or `client/`, and data is `shared/`, `server/` or `client/`. A piece's side follows its runtime and its secrets. Inside each, one singular kebab-case folder per kind, named like the file suffix: `domain/model/instrument.model.ts`, `application/server/use-case/instrument-create.use-case.ts`, `data/server/repository/instrument-pg.repository.ts`.
- **Concept first.** A file name starts with its business concept, then the concrete source (`pg`, `redis`, `finnhub`, `api`, `storage`) or, for a repository over several sources, its strategy (`cached`), then the kind. Related files sort together. A class is named like its file.
- **Ports by language.** Repository and read query ports live in domain, because the business names them. Technical ports, such as an event bus or a clock, live in `application/<side>/port/`.
- **Data access.** Infra talks to one medium in its own terms and lives in `data/<side>/infra/<medium>/`; infra any module could use lives in the platform. A repository calls its infra directly while it has one source, and uses one datasource per source once it has several (ADR 0004). External response types live with their infra client; a DTO is only our own HTTP contract. A mapping stays private until a second file needs it, then moves to `mapper/<concept>-<foreign shape>.mapper.ts`.
- **Aggregates.** A repository never depends on another aggregate's repository, but it may wrap another implementation of its own port. The root's repository loads its children. Use cases orchestrate writes that touch several aggregates. Reads across aggregates are read queries returning read models (ADR 0004).
- **No catch-all folders.** A file that fits no kind is private to its only user, or goes to the kind it acts as, to infra or to the platform. A new kind is added to the spec and the lint together.
- **Tests and support.** A test sits next to its subject and takes its full name plus the test kind (`instrument-create.use-case.integration.ts`). Builders, `given.ts` and setup files live in `src/testing/`; the `./testing` entry, built from `src/testing.ts`, exports builders only. A harness sits next to the entry point it drives, and the base harness lives in `core/harness/`.
- **Composition per runtime.** Packages wire each side in `di/server.module.ts` and `di/client.module.ts`, plus `di/browser.module.ts` for code that only runs in the browser. Apps build one container per runtime in `src/di/`.
- **Aliases.** Each project declares one `#<top-level folder>/*` alias per folder that other folders import from, as tsconfig `paths` (`kit.alias` in SvelteKit). Imports are relative only within one folder, never `../`, and never reach another package.
- **Enforced by one lint per product.** An `eslint-plugin-boundaries` factory, called once per product prefix, recognises each element by folder plus suffix, rejects unknown files and checks dependency direction, sides and import paths. Cycles between app modules are caught by the dead-code check.

## Considered options

- **Side before layer** (`server/data/repository/`): rejected. Domain has no side, so the split would scatter one concept's layers.
- **Suffix only, no kind folders** (Manguinho's layout): rejected. Each side folder becomes one long list.
- **Kind folders without suffixes**: rejected. `instrument.ts` would exist in three folders, and tabs and stack traces could not tell them apart.
- **All ports in application** (Uncle Bob's gateways in the use-case ring): rejected for repositories and read queries, whose vocabulary is the business's.
- **Always repository → datasource → infra** (Android and Flutter clean): rejected. With one source, every datasource is a pass-through (ADR 0004).
- **A `presentation/` folder in apps**: rejected. An app holds only that layer.
- **A `util/` or `lib/` kind**: rejected. It turns into a drawer, and the lint could no longer say what a file is.
- **`entity/` for domain objects**: rejected. Here an entity suggests an ORM table mapping, so the domain object is a model.
- **Aliases in `package.json` `imports`**: rejected by the owner in favour of tsconfig `paths`. The `#` prefix keeps that move free of import rewrites if it is ever needed.
- **One root alias (`#/*`)**: rejected. The alias should say where code comes from.
- **One alias per kind**: rejected. `repository/`, `query/`, `use-case/` and `port/` exist on more than one side or layer.
- **The `@` prefix**: rejected. It looks like an npm package and could collide with a real scope.

## Consequences

- qup and green-beard adopt the layout when they move to module packages, each in its own change. A new product joins the lint with one factory call.
- InvestLab's followed tickers move from the web into the quotes module, over a key-value storage in the platform. That replaces ADR 0004's note that they would stay in the web until retired; they are not being retired.
- File names get longer (`instrument-create.use-case.integration.ts`). In return, a search for a concept finds its model, ports, implementations and tests together.
- The list of kinds is closed. Adding one is a deliberate change to the spec and the lint, reviewed by the owner.
- Packages stay consumed through `dist/`, so internal aliases never leak to consumers. A tool that reads package sources directly would need each package's `paths`.
- Vite 8's `resolve.tsconfigPaths` is experimental. `vite-tsconfig-paths` is the fallback.
