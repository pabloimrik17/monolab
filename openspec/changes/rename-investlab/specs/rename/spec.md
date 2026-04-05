# Rename Specification

## RENAMED Requirements

### Requirement: Project names reflect investment domain

All workspace references SHALL use "investlab" naming: app project `investlab`, core package `@m0n0lab/investlab-core`.

#### Scenario: Package names updated

- **WHEN** workspace packages are listed
- **THEN** `@m0n0lab/investlab` and `@m0n0lab/investlab-core` exist, `@m0n0lab/wealth-react` and `@m0n0lab/wealth-tracker-core` do not

#### Scenario: Imports resolve correctly

- **WHEN** app code imports from `@m0n0lab/investlab-core`
- **THEN** all imports resolve without errors and app builds successfully
