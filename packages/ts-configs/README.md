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

```
tsconfig.base.json (foundation)
├── tsconfig.web-base.json (future - web platform)
│   ├── tsconfig.web-lib.json (future - web libraries)
│   └── tsconfig.web-app.json (future - web applications)
└── tsconfig.node-base.json (future - Node.js platform)
    ├── tsconfig.node-lib.json (future - Node.js libraries)
    └── tsconfig.node-app.json (future - Node.js applications)
```

## Available Configurations

### `tsconfig.base.json` (Current)

**Purpose:** Platform-agnostic foundation with maximum type safety and performance optimizations.

**What it provides:**
- **Language & Target:** ES2022 compilation target with ES2024 API types
- **Maximum Strictness:** 15+ strict compiler options to catch errors at compile time
- **ESM Interop:** Modern module interoperability and isolation
- **Performance:** Incremental compilation and composite project support

**What it doesn't include:**
- Module settings (`module`, `moduleResolution`) - delegated to platform configs
- Platform runtime APIs (DOM, Node.js) - delegated to platform configs
- Build output settings (declaration files, outDir, sourceMap) - delegated to usage configs

**When to use:**
- As a foundation for future platform-specific configs
- During transition period, can be extended directly (add `module` and `moduleResolution` to your project config)

**Example usage:**

```json
{
  "extends": "@monolab/ts-configs/tsconfig.base.json",
  "compilerOptions": {
    "module": "preserve",
    "moduleResolution": "bundler",
    "lib": ["ES2024", "DOM"],
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

### Platform Configs (Coming Soon)

**`tsconfig.web-base.json`** - For browser/bundler environments
- Adds: `module: "preserve"`, `moduleResolution: "bundler"`, `lib: ["DOM"]`

**`tsconfig.node-base.json`** - For Node.js environments
- Adds: `module: "NodeNext"`, `moduleResolution: "NodeNext"`

### Usage Configs (Coming Soon)

**`tsconfig.web-lib.json`** / **`tsconfig.node-lib.json`** - For libraries
- Adds: `declaration: true`, `declarationMap: true`

**`tsconfig.web-app.json`** / **`tsconfig.node-app.json`** - For applications
- Adds: `noEmit: true` (or appropriate outDir settings)

## Configuration Groups

The base configuration is organized into 4 logical groups:

### Group 1: Language & Target (5 options)
- Target ES2022 for runtime compatibility
- ES2024 lib for modern API types
- Allow JS and JSON imports
- Force module detection

### Group 2: Strictness (12 flags)
- `strict: true` (enables 7 sub-flags)
- Additional strict checks:
  - `noUnusedLocals`, `noUnusedParameters`
  - `noFallthroughCasesInSwitch`
  - `noUncheckedIndexedAccess`
  - `exactOptionalPropertyTypes`
  - `useUnknownInCatchVariables`
  - `noPropertyAccessFromIndexSignature`
  - `noImplicitOverride`
  - `noImplicitReturns`
  - `allowUnreachableCode: false`
  - `allowUnusedLabels: false`

### Group 3: ESM Interop & Isolation (4 options)
- ESM/CJS interoperability
- Isolated module compilation
- Verbatim module syntax
- Consistent casing in file names

### Group 4: Performance (3 options)
- Incremental compilation
- Composite project references
- Skip lib checks for faster builds

## Migration Guide

### For Existing Projects

If you're currently extending the old base config, you have two options:

#### Option 1: Add Platform Settings (Quick Fix)

```json
{
  "extends": "@monolab/ts-configs/tsconfig.base.json",
  "compilerOptions": {
    "module": "preserve",
    "moduleResolution": "bundler"
  }
}
```

#### Option 2: Temporarily Override Strict Flags

If the new strict flags cause compilation errors:

```json
{
  "extends": "@monolab/ts-configs/tsconfig.base.json",
  "compilerOptions": {
    "module": "preserve",
    "moduleResolution": "bundler",
    "noImplicitReturns": false,
    "noImplicitOverride": false
  }
}
```

Then gradually fix the issues and remove the overrides.

### Common Migration Issues

**`noImplicitReturns`** - Functions must return a value in all code paths

```typescript
// ❌ Error: Not all code paths return a value
function getValue(x: number): string {
  if (x > 0) {
    return "positive";
  }
  // Missing return for other cases
}

// ✅ Fixed
function getValue(x: number): string {
  if (x > 0) {
    return "positive";
  }
  return "non-positive";
}
```

**`noImplicitOverride`** - Must use `override` keyword when overriding methods

```typescript
class Base {
  greet() {}
}

// ❌ Error: This member must have an 'override' modifier
class Derived extends Base {
  greet() {}
}

// ✅ Fixed
class Derived extends Base {
  override greet() {}
}
```

**`allowUnreachableCode: false`** - Detects dead code

```typescript
// ❌ Error: Unreachable code detected
function example() {
  return true;
  console.log("never runs");
}

// ✅ Fixed - remove or restructure
function example() {
  return true;
}
```

## Benefits

### Type Safety
- Catches more errors at compile time
- Prevents common runtime bugs
- Better IDE autocompletion and error checking

### Performance
- Faster incremental builds
- Better monorepo caching with composite projects
- Optimized type checking with skipLibCheck

### Maintainability
- Clear separation between base and platform configs
- Explicit is better than implicit
- Easier to reason about configuration inheritance

## References

- [Total TypeScript TSConfig Cheat Sheet](https://www.totaltypescript.com/tsconfig-cheat-sheet)
- [TypeScript Compiler Options](https://www.typescriptlang.org/tsconfig)
- OpenSpec proposal: `openspec/changes/define-base-tsconfig/`

## License

MIT
