# @m0n0lab/ts-configs

[![npm version](https://img.shields.io/npm/v/@m0n0lab/ts-configs.svg)](https://www.npmjs.com/package/@m0n0lab/ts-configs)
[![ts-configs coverage](https://codecov.io/gh/pabloimrik17/monolab/badge.svg?flag=ts-configs)](https://codecov.io/gh/pabloimrik17/monolab?flag=ts-configs)
[![ts-configs bundle](https://codecov.io/gh/pabloimrik17/monolab/graph/bundle/ts-configs/badge.svg)](https://codecov.io/gh/pabloimrik17/monolab/bundle/ts-configs)

Shared TypeScript configurations for modern web and Node.js projects. Battle-tested, production-ready, and maximum type safety.

## Features

- 🚀 Production ready
- 📘 Well documented

## Installation

### npm

```bash
npm install @m0n0lab/ts-configs
```

### pnpm

```bash
pnpm add @m0n0lab/ts-configs
```

## Configuration Hierarchy

```text
tsconfig.base.json (platform-agnostic foundation)
├── tsconfig.web.base.json ✅
│   ├── tsconfig.web.lib.json ✅
│   └── tsconfig.web.app.json ✅
└── tsconfig.node.base.json ✅
    ├── tsconfig.node.lib.json ✅
    ├── tsconfig.node.app.json ✅
    └── tsconfig.node.tooling.json ✅
```

## Available Configurations

### `tsconfig.base.json`

**Platform-agnostic foundation config** with maximum type safety and performance optimizations.

**Includes:**

- ✅ **Language & Target**: `target` and `lib` ES2024 (see [Target and lib policy](#target-and-lib-policy))
- ✅ **Maximum Strictness**: 18 strict flags (12 compiler options)
- ✅ **ESM Interop**: Modern module handling with bundler compatibility
- ✅ **Performance**: Incremental compilation and project references support

**Does NOT include:**

- ❌ Platform-specific module settings (module, moduleResolution)
- ❌ Runtime library types (DOM, Node APIs)
- ❌ Build output configuration (declaration, outDir, etc.)

**Usage:**

```json
{
    "extends": "@m0n0lab/ts-configs/tsconfig.base.json",
    "compilerOptions": {
        // Add platform-specific settings here
        "module": "preserve", // or "NodeNext" for Node.js
        "moduleResolution": "bundler" // or omit for Node.js
    }
}
```

### `tsconfig.web.base.json`

**Base configuration for web/browser projects** with modern bundler support and DOM types.

**Extends:** `tsconfig.base.json`

**Adds:**

- ✅ **Browser Environment**: `lib: ["ES2024", "DOM", "DOM.Iterable"]`
- ✅ **Module System**: `module: "preserve"`, `moduleResolution: "bundler"`
- ✅ **React JSX**: `jsx: "react-jsx"` for React projects

**Usage:**

```json
{
    "extends": "@m0n0lab/ts-configs/tsconfig.web.base.json",
    "compilerOptions": {
        // Override JSX for SolidJS projects
        "jsx": "preserve",
        "jsxImportSource": "solid-js"
    }
}
```

### `tsconfig.web.app.json`

**Configuration for web applications** (not libraries). Optimized for bundled, executable apps.

**Extends:** `tsconfig.web.base.json`

**Adds:**

- ✅ **No Declaration Files**: `declaration: false`, `declarationMap: false` (apps don't need .d.ts)
- ✅ **Output Settings**: `noEmit: false`, `sourceMap: true` for debugging
- ✅ **Performance**: `incremental: true` for faster rebuilds
- ✅ **Mixed Codebases**: `allowJs: true` for JS/TS projects

**Usage:**

```json
{
    "extends": "@m0n0lab/ts-configs/tsconfig.web.app.json",
    "compilerOptions": {
        // Add app-specific overrides here
    },
    "include": ["src"]
}
```

### `tsconfig.web.lib.json`

**Configuration for web libraries** that will be published to npm. Optimized for React components and reusable web packages.

**Extends:** `tsconfig.web.base.json`

**Adds:**

- ✅ **Type Declarations**: `declaration: true`, `declarationMap: true` for consumers
- ✅ **Source Maps**: `sourceMap: true` for debugging published packages
- ✅ **Composite Builds**: Inherits `composite: true` for project references
- ✅ **Tree-Shaking**: Inherits `module: "preserve"` for optimal bundling

**Usage:**

```json
{
    "extends": "@m0n0lab/ts-configs/tsconfig.web.lib.json",
    "compilerOptions": {
        "outDir": "./dist",
        "rootDir": "./src"
    },
    "include": ["src/**/*"],
    "exclude": ["**/*.test.*", "**/*.spec.*"]
}
```

**Perfect for:**

- React component libraries
- Shared UI components
- Web utilities and hooks
- npm-published packages

### `tsconfig.node.tooling.json`

**Configuration for tool config files** (e.g. bundler, test runner or linter `*.config.ts`). Type-check only.

**Extends:** `tsconfig.node.base.json`

**Adds:**

- ✅ **Node.js Resolution**: Inherits `module: "NodeNext"` and `types: ["node"]`
- ✅ **Side-Effect Imports**: `noUncheckedSideEffectImports: true`
- ✅ **Self-Contained Paths**: `rootDir`, `outDir` and `tsBuildInfoFile` use `${configDir}`, so only `include` is needed
- ✅ **Composite Reference**: `emitDeclarationOnly: true` (to `out-tsc/tooling`) so the project can be referenced from `tsconfig.json`

**Usage** (`tsconfig.node.json`, referenced from the project `tsconfig.json`):

```json
{
    "extends": "@m0n0lab/ts-configs/tsconfig.node.tooling.json",
    "include": ["vite.config.ts", "vitest.config.ts"]
}
```

### `tsconfig.test.json`

Test configuration overlay for checking types without emitting files. Apply it after your
project's production configuration to preserve platform settings and strict checks while
disabling emission, composite builds and incremental compilation.

Keep file patterns and project references in the consuming configuration. TypeScript does
not inherit `references` through `extends`; copy any required references explicitly.

**Usage** (`tsconfig.test.json`):

```json
{
    "extends": ["./tsconfig.json", "@m0n0lab/ts-configs/tsconfig.test.json"],
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist", "out-tsc", "**/*.test.ts", "**/*.spec.ts"]
}
```

For Vitest type tests, point `test.typecheck.tsconfig` at this configuration and ensure
`*.test-d.ts` files are included. Continue using the production configuration for builds.

### Node.js Configs

- **`tsconfig.node.base.json`**: Base for Node.js projects (adds `module: "NodeNext"`)
- **`tsconfig.node.lib.json`**: For Node.js libraries
- **`tsconfig.node.app.json`**: For Node.js applications

## Migration Guide

### For Existing Projects

If your project currently extends the base config, migrate to the appropriate platform-specific config:

**Before:**

```json
{
    "extends": "@m0n0lab/ts-configs/tsconfig.base.json",
    "compilerOptions": {
        "module": "preserve",
        "moduleResolution": "bundler"
    }
}
```

**After (for web applications):**

```json
{
    "extends": "@m0n0lab/ts-configs/tsconfig.web.app.json",
    "include": ["src"]
}
```

**After (for web libraries):**

```json
{
    "extends": "@m0n0lab/ts-configs/tsconfig.web.lib.json",
    "include": ["src"]
}
```

**For Node.js projects (coming soon):**

```json
{
    "extends": "@m0n0lab/ts-configs/tsconfig.node.base.json",
    "compilerOptions": {
        "module": "NodeNext"
    }
}
```

### Handling New Strict Flags

The updated base config includes additional strictness flags that may cause compilation errors:

- `noImplicitReturns`: All code paths must return a value
- `noImplicitOverride`: Use `override` keyword when overriding methods
- `allowUnreachableCode: false`: No unreachable code allowed
- `allowUnusedLabels: false`: No unused labels allowed

**Temporary override during migration:**

```json
{
    "extends": "@m0n0lab/ts-configs/tsconfig.base.json",
    "compilerOptions": {
        // Temporarily disable while fixing issues
        "noImplicitReturns": false,
        "noImplicitOverride": false
    }
}
```

## Target and lib policy

`target` and `lib` are the ES year fully supported by the oldest runtime that may load the code.
`target` only downlevels syntax and never polyfills, so `lib` must not exceed the runtime (never `ESNext`).

- **Default (`tsconfig.base.json`, web configs)**: ES2024. For browsers, published libraries and anything shared with them.
- **Node 24 only (`tsconfig.node24.json`)**: ES2025 + `ESNext.Disposable`. Extend it as a second entry in `extends` (private servers, tooling).
- ES2024 configs omit `ESNext.Disposable` (no `DisposableStack` on Node 22): `await using` needs node24.
- Never bare `ESNext`: it adds collection, typedarrays, temporal and date, which Node 24 lacks. Temporal, `Uint8Array.fromBase64` and `Math.sumPrecise` are missing in Node 24: do not add them to `lib`.

## Configuration Details

### Group 1: Language & Target

```json
{
    "target": "ES2024", // Baseline ES year for the oldest runtime
    "lib": ["ES2024"], // API types that runtime guarantees
    "allowJs": true, // Allow JavaScript files
    "resolveJsonModule": true, // Import JSON files with types
    "moduleDetection": "force" // All files are modules
}
```

### Group 2: Strictness

Maximum type safety with 18 active strict flags (12 compiler options):

- `strict: true` (enables 7 built-in strict flags)
    - `noImplicitAny`, `noImplicitThis`, `strictNullChecks`
    - `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`
    - `alwaysStrict`
- 11 additional strict checks:
    - `noUnusedLocals`, `noUnusedParameters`
    - `noFallthroughCasesInSwitch`
    - `noUncheckedIndexedAccess` (array access returns `T | undefined`)
    - `exactOptionalPropertyTypes` (respects `?` vs `| undefined`)
    - `useUnknownInCatchVariables` (catch errors are `unknown`)
    - `noPropertyAccessFromIndexSignature` (use bracket notation for index signatures)
    - `noImplicitOverride` (require `override` keyword)
    - `noImplicitReturns` (all code paths must return)
    - `allowUnreachableCode: false`
    - `allowUnusedLabels: false`

### Group 3: ESM Interop & Isolation

```json
{
    "esModuleInterop": true, // Better CommonJS/ESM interop
    "isolatedModules": true, // Each file can be compiled independently
    "verbatimModuleSyntax": true, // Preserve import/export syntax
    "forceConsistentCasingInFileNames": true // Catch case sensitivity issues
}
```

### Group 4: Performance

```json
{
    "incremental": true, // Cache compilation info for faster rebuilds
    "composite": true, // Enable project references for monorepo
    "skipLibCheck": true // Skip type checking in .d.ts files
}
```

## Best Practices

1. **Use platform-specific configs**: Use `tsconfig.web.app.json` for web apps, `tsconfig.web.base.json` for web libraries (when available)
2. **Extend, don't copy**: Always extend configs rather than copying options
3. **Don't override strict flags**: Fix the issues instead (long-term benefit)
4. **Enable project references**: Use `composite: true` advantage in monorepos
5. **Leverage incremental compilation**: The configs enable this for faster rebuilds

## References

- [Total TypeScript TSConfig Cheat Sheet](https://www.totaltypescript.com/tsconfig-cheat-sheet)
- [TypeScript Compiler Options](https://www.typescriptlang.org/tsconfig)
- OpenSpec Proposal: `openspec/changes/define-base-tsconfig/`

## License

MIT
