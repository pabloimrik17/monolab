# Proposal

## Why

InvestLab, qup and green-beard apply Clean Architecture, and each lays out its code its own way:

- **InvestLab** groups by layer, then improvises inside: `entities/` and `ports/` folders, a loose `errors.ts`, source-first names (`pg-instrument.repository.ts`), serializers and harnesses in app-level folders.
- **qup** still splits layers into packages (`qup-domain`, `qup-data`), the layout [ADR 0007](../../../docs/adr/0007-investlab-package-per-module.md) replaced in InvestLab.
- **green-beard**'s plan "mirrors qup exactly", so it would start on the layout already abandoned.
- **The layer lint** only knows InvestLab's paths, so the other products get no enforcement.

ADR 0007 settled the package split: one package per module, plus core, platform and database packages. It left open what goes inside a package or an app, and how files are named. That needs settling before qup moves to module packages and before green-beard writes its first line. Settled now, both get a layout to copy, an import path that says where code comes from, and a lint that keeps the layout.

## What Changes

- **One layout for every Clean Architecture project** ([ADR 0009](../../../docs/adr/0009-clean-architecture-layout.md), amending ADR 0007). It applies to module, core and platform packages and to apps. Published libraries and the database package are out of scope.
    - Packages hold `domain/`, `application/` and `data/`, nested layer → side → kind. Apps hold presentation only: one folder per module, plus `core/` and `di/`.
    - Each kind of code gets one singular kebab-case folder, named like the file suffix: `model/instrument.model.ts`, `use-case/instrument-create.use-case.ts`.
    - Names start with the business concept, then the source or strategy: `instrument-pg.repository.ts`, `quote-cached.repository.ts`.
    - Business ports live in domain and technical ports in application.
    - Infra is grouped per medium under `data/<side>/infra/`.
    - A datasource exists only when a repository combines several sources. A mapper gets its own file only when the mapping is reused.
    - Aggregate rules: a repository never depends on another aggregate's repository, use cases orchestrate writes that touch several aggregates, and reads across aggregates are read queries.
    - Tests sit next to their subject and are named after it. Test support lives in `src/testing/`, and only builders are exported through `./testing`.
- **Path aliases**:
    - Each project maps `#<top-level folder>/*` to `src/<folder>/*` in its tsconfig `paths`; SvelteKit takes them in `kit.alias`.
    - Relative imports only inside one folder, never `../`.
    - An alias never reaches into another package.
- **One layer lint for every product**:
    - The InvestLab-only `eslint-plugin-boundaries` setup becomes one factory per product prefix, covering packages and apps.
    - Elements are recognised by kind folder and file suffix, and `no-unknown-files` rejects anything else.
- **InvestLab migrated**: portfolio, quotes, core and platform packages, the API and the web. The web moves its app directory to `src/`.
    - Moves and renames, with no behaviour change, except for one step: the followed tickers leave the web.
    - That step takes them to the quotes module (port, `localStorage` repository, use cases), wired in a new browser container.
    - The platform gains a key-value storage for it.
    - The quote polling stays in the web, as a hook.
    - **BREAKING** for open branches that touch these paths.
- **Unchanged**: package entries (`.`, `./server`, `./client`, `./testing`) and what each one exports.

## Capabilities

### New Capabilities

- `clean-architecture-layout`: where code goes and how it is named in projects that apply Clean Architecture. Covers layers, sides, kind folders, file names, aggregate rules, test placement, path aliases, and the lint that enforces them.

### Modified Capabilities

The first four capabilities come from `investlab-modular-packages`. That change must be archived before this one is applied.

- `investlab-module-packages`: point six requirements at the new layout: layer folders, the layer lint, container module and entry imports, the test file exemption, the web's imports, and composition roots. The last two now allow a browser container in the web.
- `investlab-platform`: adds a key-value storage (a text interface, typed helpers, and `localStorage` and in-memory implementations) and a browser container module that binds it without `Config`.
- `investlab-use-case-testing`: integration tests take their use case's full name, and setup files and `given.ts` move to `src/testing/<side>/`. This replaces the rule that no `src/testing/` folder exists.
- `investlab-persistence`: each aggregate declares its table in `data/server/infra/db/<concept>.table.ts`, and the database package's drizzle config lists them by glob.
- `ticker-management`: the followed tickers move from the web's ticker store to the quotes module, with a repository over the platform's key-value storage. The storage key and stored format stay the same, so lists saved before the change still load.

## Impact

- **Code**: `packages/investlab-{portfolio,quotes,core,platform}/src`, `apps/investlab`, `apps/investlab-api`, and `packages/investlab-database/drizzle.config.ts` (table glob).
- **Tooling**:
    - `eslint.config.ts`: boundaries factory.
    - Each migrated project's `tsconfig.json`: `paths`.
    - The shared Vitest and Vite configs: `resolve.tsconfigPaths`.
    - `.fallowrc.json`: drop the `src/testing/index.ts` entry workaround.
    - `docs/legacy-tests.txt`: moved legacy tests.
- **Exports**: same subpaths, but the `testing` build entry moves from `src/testing/index.ts` to `src/testing.ts`, so the package builds are validated with `attw` again.
- **Dependencies**: root devDependency `eslint-import-resolver-typescript`. No runtime or peer dependency changes.
- **Docs**:
    - New: ADR 0009.
    - Updated: ADR 0007's status (amended by ADR 0009) and `docs/GLOSSARY.md`, whose Clean Architecture section was written during the grilling.
- **Order and siblings**: this change starts once `investlab-modular-packages` is archived. The same PR carries:
    - a new `qup-module-packages` change, planned only, not implemented;
    - revisions to `green-beard-foundation`, `green-beard-inventory` and `green-beard-supplies`.
