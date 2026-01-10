# Research: Current Monorepo Structure Analysis

**Date**: 2026-01-06
**Purpose**: Analyze the monolab monorepo structure to understand how to integrate a marketplace and plugins area.

---

## 1. Repository Structure

### Directory Organization

```
monolab/
├── apps/                    # Applications (private, not published)
│   └── demo/                # SolidJS demo app (vite-based)
├── packages/                # Publishable packages (@m0n0lab/*)
│   ├── http-client/         # HTTP client contracts and axios adapter
│   ├── react-clean/         # Clean architecture for React (viewmodel patterns)
│   ├── react-hooks/         # React custom hooks
│   ├── ts-configs/          # Shared TypeScript configurations
│   └── ts-types/            # Shared TypeScript utility types
├── openspec/                # Spec-driven development workflow
├── .github/workflows/       # CI/CD automation
└── [configuration files]    # Root-level tooling configs
```

### Naming Conventions

| Category | Pattern | Example |
|----------|---------|---------|
| Package scope | `@m0n0lab/` | `@m0n0lab/react-clean` |
| Package names | kebab-case | `http-client`, `react-hooks` |
| Directory names | kebab-case | `packages/ts-configs/` |
| App names | kebab-case | `apps/demo/` |
| Private packages | `"private": true` in package.json | demo app |

### Configuration Patterns

- Root-level configurations inherited by packages
- Each package can override with local configs
- Shared configs extracted to dedicated packages (`@m0n0lab/ts-configs`)

---

## 2. Build System

### Nx Configuration

**Key Nx Features Used**:
- Nx Cloud for distributed caching and task execution
- `@nx/js/typescript` plugin for TypeScript project inference
- Named inputs for cache invalidation (`default`, `production`, `sharedGlobals`)
- Target defaults for common tasks (build, lint, test)

### Target Defaults

| Target | Cache | Depends On | Description |
|--------|-------|------------|-------------|
| `build` | Yes | `^build` | Build with TSC or tsdown |
| `test:unit` | Yes | `^build`, `^test:unit` | Vitest unit tests |
| `test:mutation` | Yes | `^build`, `build` | Stryker mutation testing |
| `lint:eslint` | Yes | `^build`, `^lint:eslint` | ESLint checks |
| `lint:prettier` | Yes | `^lint:eslint`, `^lint:prettier` | Prettier checks |

### TypeScript Configuration

**Hierarchy**:
```
packages/ts-configs/tsconfig.base.json    # Ultimate base config
    └── [root]/tsconfig.base.json         # Extends ts-configs, adds monorepo options
        └── packages/*/tsconfig.json       # Per-package extends root base
```

**Base Config Features**:
- ES2022 target with ES2024 lib
- Maximum strictness enabled (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- ESM interop settings (`verbatimModuleSyntax`, `isolatedModules`)
- Composite mode for project references

### Build Tools by Package

| Package | Build Tool | Notes |
|---------|------------|-------|
| react-clean | tsdown | Bundler with SWC |
| react-hooks | tsdown | Bundler with SWC |
| ts-configs | N/A | Config files only |
| ts-types | tsc | TypeScript compiler |
| http-client | tsc | TypeScript compiler |

---

## 3. Package Management

### pnpm Workspace Setup

**File**: `pnpm-workspace.yaml`

```yaml
packages:
    - apps/*
    - packages/*

catalog:
    "@testing-library/react": 16.3.0
    "@vitest/coverage-v8": 4.0.6
    vitest: 4.0.6

allowBuilds:
    "@swc/core": true
    esbuild: true
    nx: true

blockExoticSubdeps: true
minimumReleaseAge: 1440
```

**Key Features**:
- Catalog for shared dependency versions (use `catalog:` in package.json)
- Build allowlist for native dependencies
- 24-hour minimum release age for security
- Blocked exotic subdependencies

### Package References

**Internal Dependencies** (use `workspace:*`):
```json
{
    "dependencies": {
        "@m0n0lab/react-hooks": "workspace:*"
    },
    "devDependencies": {
        "@m0n0lab/ts-types": "workspace:*"
    }
}
```

**Publishing Configuration**:
```json
{
    "publishConfig": {
        "access": "public",
        "provenance": true,
        "registry": "https://registry.npmjs.org/"
    }
}
```

---

## 4. Existing Packages

### Package Summary

| Package | Purpose | Version | Has Tests | Has Build |
|---------|---------|---------|-----------|-----------|
| react-clean | Clean architecture patterns (BaseViewModel, useViewModel) | 3.1.4 | Yes | Yes (tsdown) |
| react-hooks | Reusable React hooks | 1.1.4 | Yes | Yes (tsdown) |
| ts-configs | Shared tsconfig presets | 1.1.4 | No | No |
| ts-types | Utility TypeScript types | 1.0.6 | Yes | Yes (tsc) |
| http-client | HTTP client contracts + axios adapter | 0.1.0 | Yes | Yes (tsc) |

### Export Patterns

**Standard Library Export**:
```json
{
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            "import": "./dist/index.js",
            "default": "./dist/index.js"
        },
        "./package.json": "./package.json"
    },
    "main": "./dist/index.js",
    "types": "./dist/index.d.ts"
}
```

### Deno/JSR Support

Each package has a `deno.json` for JSR publishing:
```json
{
    "name": "@m0n0lab/react-clean",
    "version": "3.1.4",
    "license": "MIT",
    "exports": "./src/index.ts"
}
```

---

## 5. Testing and Quality

### Vitest Configuration

- JUnit reporter for Codecov Test Analytics
- v8 coverage provider with lcov output
- jsdom environment for React testing
- Browser tests via Playwright (disabled by default)

### Mutation Testing

- Stryker Mutator with Vitest runner
- Incremental mode with JSON cache
- 60% break threshold, 80% high target
- Dashboard reporting to stryker-mutator.io

### Code Coverage

- Codecov integration with per-package flags
- Coverage targets: auto-target with 2% threshold
- Patch coverage: 50% target for new code

---

## 6. CI/CD

### GitHub Actions Workflows

**ci.yml**:
1. Setup (pnpm, Node.js 24.12.0)
2. Nx Cloud CI Run (distributed on 3 agents)
3. Integrity checks (`nx sync:check`, `build:check-exports`)
4. Lint checks (eslint, stylelint, markdownlint, prettier, knip)
5. Unit tests with coverage
6. Type tests
7. Codecov uploads (per-package flags)
8. Build
9. Mutation testing (main/develop only)
10. Bundle size analysis

**release-please.yml**:
1. Release Please action (manifest mode)
2. Build and publish to JSR (Deno)
3. Build and publish to npm (pnpm)

### Release Process

- **Tool**: Release Please (Google)
- **Mode**: Monorepo manifest
- **Config**: `release-please-config.json` + `.release-please-manifest.json`
- **Registries**: npm (primary) + JSR (Deno)
- **Provenance**: Enabled for supply chain security

### Branch Strategy

- `main`: Production releases
- `develop`: Integration branch (default base)
- `pre`: Pre-release testing
- Feature branches from `develop`

---

## 7. Integration Recommendations

### Where Marketplace/Plugins Should Live

Based on the existing patterns, I recommend:

```
monolab/
├── apps/                    # Existing applications
│   └── demo/
├── packages/                # Core library packages (existing)
│   ├── http-client/
│   ├── react-clean/
│   ├── react-hooks/
│   ├── ts-configs/
│   └── ts-types/
├── plugins/                 # NEW: Claude Code plugins
│   ├── plugin-a/
│   └── plugin-b/
├── marketplace/             # NEW: Marketplace infrastructure
│   └── .claude-plugin/
│       └── marketplace.json
└── openspec/
```

### pnpm-workspace.yaml Update

Add new workspace patterns:

```yaml
packages:
    - apps/*
    - packages/*
    - plugins/*          # NEW
    - marketplace/*      # NEW
```

### Naming Conventions to Follow

| Type | Pattern | Example |
|------|---------|---------|
| Plugin packages | `@m0n0lab/plugin-{name}` | `@m0n0lab/plugin-auth` |
| Marketplace packages | `@m0n0lab/marketplace-{name}` | `@m0n0lab/marketplace-registry` |

### Configuration Updates Required

1. **pnpm-workspace.yaml**: Add `plugins/*` and `marketplace/*`
2. **tsconfig.json**: Add references for new packages
3. **deno.json**: Add workspace entries for JSR publishing
4. **nx.json**: Target defaults automatically apply (no changes needed)
5. **release-please-config.json**: Add new package entries
6. **.release-please-manifest.json**: Add initial versions
7. **codecov.yaml**: Add flags for new packages

---

## 8. Summary

The monolab monorepo follows modern best practices:

- **Nx** for task orchestration with cloud caching
- **pnpm** workspaces with catalog for dependency management
- **TypeScript** with strict settings and project references
- **Vitest** for testing with Codecov integration
- **Release Please** for automated versioning and publishing
- **Dual publishing** to npm and JSR

To integrate a marketplace and plugins area:

1. Create `plugins/` directory at root level (parallel to `packages/`)
2. Create `marketplace/` directory for infrastructure
3. Update workspace configuration to include new directories
4. Follow existing patterns for package.json, tsconfig, and scripts
5. Add to CI/CD for automated testing and publishing

The modular architecture and existing patterns make this extension straightforward while maintaining consistency across the codebase.
