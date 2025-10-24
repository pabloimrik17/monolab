# Project Context

## Purpose
**MonoLab** is an Nx-powered monorepo containing a collection of modern JavaScript/TypeScript utility packages and libraries published to JSR (JavaScript Registry):

- **Utility Packages**: Simple, focused utilities like `is-even` and `is-odd` for common programming tasks
- **React Ecosystem**: Professional React libraries including:
  - `react-hooks`: Custom lifecycle hooks (useDidMount, useWillUnmount)
  - `react-clean`: MVVM pattern library using Inversify (IoC) and RxJS for reactive state management
- **Shared Configurations**: `ts-configs` package for consistent TypeScript settings across projects
- **Demo Application**: SolidJS + Vite showcase application demonstrating the utilities

**Goals**: Provide well-typed, tree-shakeable, ESM-only packages with modern tooling, strict quality standards, and independent versioning per package.

## Tech Stack

### Core Technologies
- **Node.js**: 22.17.0 (managed via `.nvmrc`)
- **Package Manager**: pnpm 10.13.1 (locked with sha512 hash)
- **Language**: TypeScript 5.9.2 (strict mode enabled)
- **Monorepo Tool**: Nx 21.3.11 with @nx/js plugin

### Frameworks & Libraries
- **React**: 18.3.24 (for react-hooks, react-clean packages)
- **SolidJS**: 1.9.9 (for demo application)
- **Inversify**: 7.0.0 (IoC container for react-clean)
- **RxJS**: 7.0.0 (reactive programming for react-clean)

### Build & Bundling Tools
- **Vite**: 6.4.0 (for demo app development)
- **tsdown**: 0.12.9 (TypeScript bundler for library packages)
- **SWC**: 1.5.7 (Rust-based transpiler for performance)

### Quality & Linting Tools
- **ESLint**: 9.25.0 with typescript-eslint 8.30.1
- **Prettier**: 2.6.2 with organize-imports and packagejson plugins
- **Stylelint**: 16.25.0 (CSS/SCSS linting)
- **Knip**: 5.50.5 (unused code detection)
- **Markdownlint**: 0.44.0 (Markdown formatting)

### Testing
- **Vitest**: Unit testing with coverage enabled
- **@arethetypeswrong/cli**: Package export validation

### Git Workflow Tools
- **Husky**: 9.1.7 (Git hooks)
- **lint-staged**: 16.1.5 (Pre-commit linting)
- **commitlint**: 19.8.0 (Commit message validation)
- **validate-branch-name**: 1.3.2 (Branch naming enforcement)

### CI/CD & Publishing
- **GitHub Actions**: Automated CI pipeline with Nx Cloud integration
- **JSR**: Primary package registry for publishing
- **Nx Cloud**: Distributed task execution (ID: 67f985a4bdd1693cbb6398fa)

## Project Conventions

### Code Style

**Prettier Configuration** (`.prettierrc`):
- 4-space indentation (no tabs)
- Single attribute per line in JSX/TSX
- Auto-organize imports on save
- Consistent package.json formatting

**ESLint Configuration** (`eslint.config.ts`):
- Flat config format with @eslint/js + typescript-eslint
- Strict TypeScript rules enforced
- Ignores: `dist/`, `node_modules/`, `coverage/`, `*.html`

**Naming Conventions**:
- Files: kebab-case (e.g., `use-did-mount.hook.ts`, `base.viewmodel.ts`)
- Classes: PascalCase (e.g., `BaseViewModel`)
- Functions/variables: camelCase
- Constants: UPPER_SNAKE_CASE (where applicable)
- Hooks: `use*` prefix (e.g., `useDidMount`)

**File Organization**:
- Source code: `src/`
- Compiled output: `dist/`
- Configuration files: Root level
- Nx project configs: `project.json` per package

### Architecture Patterns

**Monorepo Structure**:
- `apps/`: Applications (e.g., demo SolidJS app)
- `packages/`: Reusable libraries and utilities
- `tools/`: Build and automation scripts
- `openspec/`: AI assistant guidelines and change proposals

**Library Design Patterns**:
- **Pure Utility Functions**: Stateless, side-effect-free functions (is-even, is-odd)
- **MVVM Pattern**: `react-clean` uses Inversify decorators (@injectable) with BaseViewModel
- **Reactive Programming**: RxJS Subscriptions for state management
- **Custom React Hooks**: Lifecycle abstractions (useDidMount, useWillUnmount)
- **ESM-Only**: All packages use ES modules, tree-shakeable
- **Composite Builds**: TypeScript project references for incremental compilation

**Dependency Management**:
- Workspace protocol (`workspace:*`) for internal dependencies
- Peer dependencies for React, Inversify, RxJS (avoid bundling)
- Strict peer dependency handling via `.npmrc` configuration

**Package Export Strategy**:
- Named exports via `index.ts`
- `package.json` exports field for entry points
- Side effects: false (enables tree-shaking)
- Validated with @arethetypeswrong/cli (attw)

### Testing Strategy

**Framework**: Vitest with coverage enabled

**Test Execution**:
- `test:unit`: Run all tests with coverage thresholds
- `test:unit:watch`: Watch mode for development
- Coverage output: `{projectRoot}/coverage` and `{projectRoot}/html`

**CI Testing Approach**:
- **Pull Requests**: Run affected tests only, disable coverage thresholds
- **Main Branch**: Run all tests with full coverage enforcement

**Coverage Requirements**:
- Varies per package (configured in individual project.json files)
- Coverage reports generated in multiple formats (html, json, lcov)

**Current Status**: Test files not extensively present in source (test infrastructure configured but tests may be minimal)

### Git Workflow

**Branch Naming Rules** (`validate-branch-name.config.cjs`):
- Protected branches: `main`, `develop`, `pre`, `master`, `origin`
- Feature branches: `feature/*`, `bugfix/*`, `fix/*`, `hotfix/*`, `release/*`, `renovate/*`

**Commit Conventions** (`commitlint.config.ts`):
- Follows Conventional Commits specification
- Types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`, `ci`, `build`, `revert`
- Format: `type(scope): description`
- Enforced via commit-msg hook

**Git Hooks** (Husky):
- **pre-commit**:
  1. Validates branch names
  2. Runs lint-staged (ESLint, Prettier, Knip, Stylelint, Markdownlint)
  3. Fixes issues automatically where possible
- **commit-msg**:
  1. Validates commit message format with commitlint

**Release Strategy** (Nx Release):
- Independent versioning per package
- Conventional commits drive version bumps
- Changelog generation with GitHub releases
- Automated JSR publishing via GitHub Actions

**Workflow Summary**:
1. Create feature branch with proper naming
2. Make changes with incremental commits
3. Pre-commit hooks auto-fix linting issues
4. Commit messages validated against conventional format
5. Push triggers CI pipeline (affected or all tasks)
6. Merge to main triggers publishing workflow for affected packages

## Domain Context

**JavaScript/TypeScript Ecosystem**:
- This project contributes to the modern JavaScript ecosystem via JSR (JavaScript Registry)
- Focuses on ESM-first, tree-shakeable packages for optimal bundle sizes
- Targets both browser and Node.js environments

**React Patterns**:
- MVVM (Model-View-ViewModel) pattern for separating UI logic from business logic
- Dependency Injection via Inversify for testable, maintainable React components
- Reactive state management using RxJS for complex data flows
- Custom hooks for lifecycle management and reusable behavior

**Utility Library Philosophy**:
- Small, focused packages doing one thing well
- Zero or minimal dependencies
- Comprehensive TypeScript types for excellent IDE support
- Side-effect-free for predictable behavior

**Monorepo Management**:
- Nx workspace for efficient build caching and task orchestration
- Affected commands to only build/test/lint changed projects
- Workspace dependencies for sharing code between packages
- Independent versioning to allow packages to evolve separately

## Important Constraints

**Runtime Requirements**:
- **Node.js**: Exactly 22.17.0 (enforced via package.json engines field and `.nvmrc`)
- **pnpm**: Exactly 10.13.1 with specific sha512 hash (use `corepack prepare pnpm@10.13.1 --activate`)
- Use `nvm use` to automatically switch to the correct Node version

**TypeScript Strictness**:
- Strict mode enabled globally
- No unused locals or parameters allowed
- Exact optional property types
- No emit on error
- Declaration maps required for composite builds

**Package Registry**:
- Primary publishing target: JSR (not npm)
- Packages must pass `attw --pack` export validation
- No CJS (CommonJS) - ESM only

**Monorepo Integrity**:
- All packages must maintain valid Nx project configuration
- Changes trigger affected task execution (don't assume all tests need to run)
- Knip threshold: Max 70 issues (enforced in CI)

**Build Constraints**:
- Composite TypeScript builds (incremental compilation)
- Build cache managed by Nx Cloud
- Output directory always `dist/`
- Declaration files (.d.ts) required for all libraries

**Dependency Constraints**:
- `strict-peer-dependencies=false` in `.npmrc` to allow flexibility
- `auto-install-peers=true` for convenience
- Peer dependencies (React, Inversify, RxJS) must not be bundled

## External Dependencies

**JSR (JavaScript Registry)**:
- Primary package publishing platform
- Requires `npx jsr publish` for deployment
- Automated via GitHub Actions on main branch pushes

**Nx Cloud**:
- Cloud ID: `67f985a4bdd1693cbb6398fa`
- Distributed task execution for faster CI
- Caching shared across CI runs and developers
- 3 linux-medium-js agents in CI

**GitHub Services**:
- **GitHub Actions**: CI/CD pipeline execution
- **GitHub Releases**: Automated changelog and release notes
- **GitHub Token**: Required for CI operations (stored in `.env` and CI secrets)

**Third-Party Tools**:
- **@arethetypeswrong/cli (attw)**: Export validation for TypeScript packages
- **CodeRabbit**: Automated code review for main/develop branches

**Development Services**:
- **nvm**: Node version management
- **corepack**: pnpm version management (built into Node.js)
- **Husky**: Git hooks management

**Build-Time Dependencies**:
- **Vite Dev Server**: For demo application development
- **tsdown**: For compiling TypeScript libraries
- **SWC**: For fast transpilation
