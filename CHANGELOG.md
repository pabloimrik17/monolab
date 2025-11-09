# Changelog

All notable changes to this monorepo will be documented in this file.

This changelog tracks changes that affect the entire monorepo, infrastructure, CI/CD, tooling, and cross-cutting concerns. For package-specific changes, see the CHANGELOG.md in each package directory.

## 1.0.0

### Features

-   Automated dual publishing to npm and JSR registries
-   Release automation using release-please
-   Per-package independent versioning
-   Monorepo-wide CI/CD workflows

### Infrastructure

-   GitHub Actions workflows for releases and publishing
-   OIDC authentication for npm Trusted Publishers
-   Conventional commits enforcement
