# Proposal

## Why

qup still uses the layer packages that [ADR 0007](../../../docs/adr/0007-investlab-package-per-module.md) replaced in InvestLab:
- `qup-domain` holds entities, ports and every use case.
- `qup-data` holds the Postgres repositories, the drizzle schema and the migrations.
- `qup-shared` holds the wire DTOs.
- Infrastructure lives in the apps: the event bus in `qup-api`, the HTTP client and the SSE client in `qup-web`.

[ADR 0009](../../../docs/adr/0009-clean-architecture-layout.md) gives every Clean Architecture project one layout, and qup is the second product to adopt it. This change plans the move; it is not implemented until the `qup` change is archived and the open `qup-board-*` branches have landed.

## What Changes

- **Packages per ADR 0007**:
    - module package(s): proposed, a single `@m0n0lab/qup-ordering` holding menu items, sessions and orders (an open question, design §1);
    - `@m0n0lab/qup-core`: kernel errors and the API error envelope;
    - `@m0n0lab/qup-platform`: `Config`, HTTP client, Postgres handle, SSE client;
    - `@m0n0lab/qup-database`: drizzle config, migrations and a migrate helper.
- **BREAKING (workspace only)**: `@m0n0lab/qup-domain`, `@m0n0lab/qup-data` and `@m0n0lab/qup-shared` are removed.
- **Layout per `clean-architecture-layout`**:
    - Packages take layer → side → kind and concept-first names.
    - `qup-api` and `qup-web` keep only presentation: modules, `core/`, `di/`.
    - qup-web's SolidStart route files become thin shells, and its `"use server"` functions become loaders and actions.
- **Aliases**: `#<folder>/*` in every qup tsconfig. `qup-web` adds `vite-tsconfig-paths`, because SolidStart runs on Vite 6.4.
- **Lint**: one `cleanArchitectureLint` call with the `qup` prefix.
- **Behaviour unchanged**: the HTTP API, SSE events, UI flows and database schema stay as they are.

## Capabilities

### New Capabilities

- `qup-module-packages`: how qup code is packaged: module, core, platform and database packages, apps as composition roots, and the layer packages removed.

### Modified Capabilities

None. qup's behaviour specs belong to the in-flight `qup` change and do not change. The layout rules come from `clean-architecture-layout`, which already covers qup.

## Impact

- **Code**: `packages/qup-{domain,data,shared}` are replaced by the new packages; `apps/qup-api` and `apps/qup-web` are reorganised; drizzle migrations move with their history.
- **Dependencies**: `vite-tsconfig-paths` (`apps/qup-web` devDependency). The new packages take over the dependencies of the ones they replace.
- **Tooling**: `eslint.config.ts` (one factory call), `.fallowrc.json` (qup-web entries, `publicPackages`), `docs/legacy-tests.txt` (moved legacy tests).
- **Order**: after `clean-architecture-layout` is applied and archived, the `qup` change is archived, and the `qup-board-*` branches are merged or dropped.
