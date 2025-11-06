# @monolab/ts-configs

[![ts-configs coverage](https://codecov.io/gh/pabloimrik17/monolab/badge.svg?flag=ts-configs)](https://codecov.io/gh/pabloimrik17/monolab?flag=ts-configs)
[![ts-configs bundle](https://codecov.io/gh/pabloimrik17/monolab/graph/bundle/ts-configs/badge.svg)](https://codecov.io/gh/pabloimrik17/monolab/bundle/ts-configs)

Shared TypeScript configurations for the monolab monorepo.

## Installation

```bash
npm install @monolab/ts-configs
# or
pnpm add @monolab/ts-configs
```

## Configuration Hierarchy

```text
tsconfig.base.json (platform-agnostic foundation)
├── tsconfig.web.base.json
│   ├── tsconfig.web.lib.json ✅
│   └── tsconfig.web.app.json (coming soon)
└── tsconfig.node.base.json
    ├── tsconfig.node.lib.json (coming soon)
    └── tsconfig.node.app.json (coming soon)
```

## Available Configurations

### `tsconfig.base.json`

**Platform-agnostic foundation config** with maximum type safety and performance optimizations.

**Includes:**

-   ✅ **Language & Target**: ES2022 output, ES2024 API types
-   ✅ **Maximum Strictness**: 18 strict flags (12 compiler options)
-   ✅ **ESM Interop**: Modern module handling with bundler compatibility
-   ✅ **Performance**: Incremental compilation and project references support

**Does NOT include:**

-   ❌ Platform-specific module settings (module, moduleResolution)
-   ❌ Runtime library types (DOM, Node APIs)
-   ❌ Build output configuration (declaration, outDir, etc.)

**Usage:**

```json
{
    "extends": "@monolab/ts-configs/tsconfig.base.json",
    "compilerOptions": {
        // Add platform-specific settings here
        "module": "preserve", // or "NodeNext" for Node.js
        "moduleResolution": "bundler" // or omit for Node.js
    }
}
```

### `tsconfig.web.base.json`

**Web platform base config** extending the foundation config with browser-specific settings.

**Adds to base config:**

-   ✅ **Browser Environment**: `lib: ["ES2024", "DOM", "DOM.Iterable"]`
-   ✅ **Modern Bundler Support**: `module: "preserve"`, `moduleResolution: "bundler"`
-   ✅ **React JSX**: `jsx: "react-jsx"`

**Usage:**

```json
{
    "extends": "@monolab/ts-configs/tsconfig.web.base.json",
    "compilerOptions": {
        "outDir": "./dist",
        "rootDir": "./src"
    }
}
```

### `tsconfig.web.lib.json`

**Web library config** for publishable React components and web libraries.

**Adds to web.base config:**

-   ✅ **Type Declarations**: `declaration: true`, `declarationMap: true`
-   ✅ **Source Maps**: `sourceMap: true` for debugging published packages
-   ✅ **Composite Builds**: Inherits `composite: true` for project references
-   ✅ **Tree-Shaking**: Inherits `module: "preserve"` for optimal bundling

**Usage:**

```json
{
    "extends": "@monolab/ts-configs/tsconfig.web.lib.json",
    "compilerOptions": {
        "outDir": "./dist",
        "rootDir": "./src"
    },
    "include": ["src/**/*"],
    "exclude": ["**/*.test.*", "**/*.spec.*"]
}
```

**Perfect for:**

-   React component libraries
-   Shared UI components
-   Web utilities and hooks
-   JSR-published packages

### Platform Configs (Coming Soon)

Additional platform-specific configs:

-   **`tsconfig.web.app.json`**: For web applications (adds `noEmit: true`)
-   **`tsconfig.node.base.json`**: Base for Node.js projects (adds `module: "NodeNext"`)
-   **`tsconfig.node.lib.json`**: For Node.js libraries
-   **`tsconfig.node.app.json`**: For Node.js applications

## Migration Guide

### For Existing Projects

If your project currently extends the old base config, you'll need to add platform-specific settings:

**Before:**

```json
{
    "extends": "@monolab/ts-configs/tsconfig.base.json"
}
```

**After (for web libraries):**

```json
{
    "extends": "@monolab/ts-configs/tsconfig.web.lib.json",
    "compilerOptions": {
        "outDir": "./dist",
        "rootDir": "./src"
    }
}
```

**After (for web applications):**

```json
{
    "extends": "@monolab/ts-configs/tsconfig.web.base.json",
    "compilerOptions": {
        "outDir": "./dist",
        "rootDir": "./src"
    }
}
```

**After (for Node.js projects):**

```json
{
    "extends": "@monolab/ts-configs/tsconfig.base.json",
    "compilerOptions": {
        "module": "NodeNext"
    }
}
```

### Handling New Strict Flags

The updated base config includes additional strictness flags that may cause compilation errors:

-   `noImplicitReturns`: All code paths must return a value
-   `noImplicitOverride`: Use `override` keyword when overriding methods
-   `allowUnreachableCode: false`: No unreachable code allowed
-   `allowUnusedLabels: false`: No unused labels allowed

**Temporary override during migration:**

```json
{
    "extends": "@monolab/ts-configs/tsconfig.base.json",
    "compilerOptions": {
        // Temporarily disable while fixing issues
        "noImplicitReturns": false,
        "noImplicitOverride": false
    }
}
```

## Configuration Details

### Group 1: Language & Target

```json
{
    "target": "ES2022", // Stable runtime target (2 versions back)
    "lib": ["ES2024"], // Modern API types (penultimate version)
    "allowJs": true, // Allow JavaScript files
    "resolveJsonModule": true, // Import JSON files with types
    "moduleDetection": "force" // All files are modules
}
```

### Group 2: Strictness

Maximum type safety with 18 active strict flags (12 compiler options):

-   `strict: true` (enables 7 built-in strict flags)
    -   `noImplicitAny`, `noImplicitThis`, `strictNullChecks`
    -   `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`
    -   `alwaysStrict`
-   11 additional strict checks:
    -   `noUnusedLocals`, `noUnusedParameters`
    -   `noFallthroughCasesInSwitch`
    -   `noUncheckedIndexedAccess` (array access returns `T | undefined`)
    -   `exactOptionalPropertyTypes` (respects `?` vs `| undefined`)
    -   `useUnknownInCatchVariables` (catch errors are `unknown`)
    -   `noPropertyAccessFromIndexSignature` (use bracket notation for index signatures)
    -   `noImplicitOverride` (require `override` keyword)
    -   `noImplicitReturns` (all code paths must return)
    -   `allowUnreachableCode: false`
    -   `allowUnusedLabels: false`

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

1. **Use platform-specific configs**: Prefer `tsconfig.web.lib.json` over `tsconfig.base.json` for web libraries
2. **Don't override strict flags**: Fix the issues instead (long-term benefit)
3. **Enable project references**: The configs include `composite: true` for monorepo support
4. **Add project-specific settings**: Only set `outDir`, `rootDir`, and excludes in your project config
5. **Migrate to platform configs**: Use `tsconfig.web.base.json` or `tsconfig.node.base.json` instead of base config

## References

-   [Total TypeScript TSConfig Cheat Sheet](https://www.totaltypescript.com/tsconfig-cheat-sheet)
-   [TypeScript Compiler Options](https://www.typescriptlang.org/tsconfig)
-   OpenSpec Proposal: `openspec/changes/define-base-tsconfig/`

## License

MIT
