## MODIFIED Requirements

### Requirement: One package per business module

InvestLab business code SHALL live in one package per module: `@m0n0lab/investlab-catalog` (the instrument catalog), `@m0n0lab/investlab-portfolio` (portfolio items), `@m0n0lab/investlab-quotes` (market data) and `@m0n0lab/investlab-roger` (entries that follow the trader Roger). A module package SHALL import another only along an edge declared in the lint configuration and only through the other's public entries, and the declared edges SHALL have no cycle. The declared edges SHALL be exactly: portfolio → catalog and roger → catalog. No module SHALL import a module that follows a trader. A lint check SHALL fail CI on an undeclared import.

#### Scenario: Modules are independent

- **WHEN** the imports of `@m0n0lab/investlab-quotes` are listed
- **THEN** none points to `@m0n0lab/investlab-portfolio`, `@m0n0lab/investlab-catalog` or `@m0n0lab/investlab-roger`, and none of those imports quotes

#### Scenario: Undeclared import between modules

- **WHEN** a file in `@m0n0lab/investlab-quotes` imports `@m0n0lab/investlab-portfolio`
- **THEN** the boundary lint check fails

#### Scenario: Declared edge

- **WHEN** a file in `packages/investlab-portfolio/src/data/server/` imports the instruments table from `@m0n0lab/investlab-catalog/server`
- **THEN** the boundary lint check passes

#### Scenario: Roger reaches the catalog

- **WHEN** a file in `packages/investlab-roger/src/application/server/` imports the instrument create use-case token from `@m0n0lab/investlab-catalog/server`
- **THEN** the boundary lint check passes

#### Scenario: Edge in the wrong direction

- **WHEN** a file in `@m0n0lab/investlab-catalog` imports `@m0n0lab/investlab-portfolio`
- **THEN** the boundary lint check fails

#### Scenario: Trader module is a leaf

- **WHEN** a file in `@m0n0lab/investlab-portfolio` or `@m0n0lab/investlab-catalog` imports `@m0n0lab/investlab-roger`
- **THEN** the boundary lint check fails

#### Scenario: Cycle in the declared edges

- **WHEN** the declared edges are changed to contain a cycle
- **THEN** the lint configuration fails to load and every lint run fails

#### Scenario: Projects selected by name pattern

- **WHEN** `nx show projects -p '@m0n0lab/investlab*'` runs
- **THEN** it lists exactly `@m0n0lab/investlab`, `@m0n0lab/investlab-api`, `@m0n0lab/investlab-core`, `@m0n0lab/investlab-platform`, `@m0n0lab/investlab-database`, `@m0n0lab/investlab-catalog`, `@m0n0lab/investlab-portfolio`, `@m0n0lab/investlab-quotes` and `@m0n0lab/investlab-roger`

### Requirement: Apps are composition roots

Each app SHALL build one container per runtime by binding only its `Config` adapter and loading the platform module and the business modules of its side. The web's browser container SHALL bind nothing and load only the browser modules of the platform and the modules, from their `./browser` entries. Routes, loaders, actions and hooks SHALL call use cases and SHALL NOT resolve repositories or read the environment.

#### Scenario: API container

- **WHEN** `apps/investlab-api` builds its container
- **THEN** it binds the process-environment `Config` adapter and loads the platform, catalog, portfolio, quotes and roger server modules, and binds nothing else

#### Scenario: Web server container

- **WHEN** `apps/investlab` builds its server container
- **THEN** it loads the platform, catalog, portfolio, quotes and roger client modules

#### Scenario: Web loader

- **WHEN** the `/portfolio` loader runs
- **THEN** it resolves the client portfolio item list use case and calls it, without touching a repository

#### Scenario: Browser container

- **WHEN** `apps/investlab` builds its browser container
- **THEN** it loads the platform and quotes browser modules, binds no `Config`, and resolves the followed ticker use cases
