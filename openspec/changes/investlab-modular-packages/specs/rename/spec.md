## MODIFIED Requirements

### Requirement: Project names reflect investment domain

All workspace references SHALL use "investlab" naming: app projects `investlab` and `investlab-api`, module packages `@m0n0lab/investlab-<module>` (`portfolio`, `quotes`) and the shared `@m0n0lab/investlab-platform`. No `@m0n0lab/investlab-core` package and none of the layer packages (`investlab-domain`, `investlab-data-contracts`, `investlab-data-server`, `investlab-data-client`, `investlab-application-server`, `investlab-application-client`) SHALL exist.

#### Scenario: Package names updated

- **WHEN** workspace packages are listed
- **THEN** `@m0n0lab/investlab`, `@m0n0lab/investlab-api`, `@m0n0lab/investlab-portfolio`, `@m0n0lab/investlab-quotes` and `@m0n0lab/investlab-platform` exist, and `@m0n0lab/investlab-core`, the six layer packages, `@m0n0lab/wealth-react` and `@m0n0lab/wealth-tracker-core` do not

#### Scenario: Imports resolve correctly

- **WHEN** app code imports from `@m0n0lab/investlab-*` packages
- **THEN** all imports resolve without errors and app builds successfully
