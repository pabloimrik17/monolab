## MODIFIED Requirements

### Requirement: Project names reflect investment domain

All workspace references SHALL use "investlab" naming: app projects `investlab` and `investlab-api`, packages `@m0n0lab/investlab-<layer>` (`domain`, `data-contracts`, `application-server`, `data-server`, `application-client`, `data-client`). No `@m0n0lab/investlab-core` package SHALL exist; its code lives in `investlab-data-server` datasources and `apps/investlab`.

#### Scenario: Package names updated

- **WHEN** workspace packages are listed
- **THEN** `@m0n0lab/investlab` and `@m0n0lab/investlab-api` exist, and `@m0n0lab/investlab-core`, `@m0n0lab/wealth-react` and `@m0n0lab/wealth-tracker-core` do not

#### Scenario: Imports resolve correctly

- **WHEN** app code imports from `@m0n0lab/investlab-*` packages
- **THEN** all imports resolve without errors and app builds successfully
