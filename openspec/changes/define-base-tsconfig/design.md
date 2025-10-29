# Base TypeScript Configuration Design

## Context

The monolab monorepo requires TypeScript configurations for multiple project types: web applications, Node.js applications, libraries for both platforms. Currently, `packages/ts-configs/tsconfig.base.json` serves as a base but lacks clear design principles and comprehensive strictness.

**Stakeholders:**
- All TypeScript projects in the monorepo
- Developers requiring fast build times and strong type safety
- Future platform-specific and usage-specific configuration files

**Constraints:**
- Must be platform-agnostic (no Node/browser-specific settings)
- Must support monorepo project references
- Must maintain modern JavaScript feature access
- Must maximize type safety without compromising developer experience

## Goals / Non-Goals

**Goals:**
- Maximum type safety through comprehensive strict compiler options
- Optimize build performance with incremental compilation and project references
- Target stable ES2022 runtime with ES2024 API types
- Create extensible foundation for derived configurations
- Organize options into logical groups for maintainability

**Non-Goals:**
- Build output configuration (declaration files, outDir, sourceMap) - delegated to lib/app configs
- Platform-specific module resolution - delegated to web-base/node-base configs
- Runtime library types (DOM, Node APIs) - delegated to platform configs
- Implementation of derived configurations (web-base, node-base, lib, app configs)

## Decisions

### Decision 1: Balanced Foundation Approach

**Options considered:**
1. **Minimal Core** - Only strictness + ES version (~15 options)
2. **Balanced Foundation** - Strictness + performance + ESM interop (~25 options) ✅
3. **Comprehensive Platform-Agnostic** - Everything except module/lib (~35 options)

**Chosen:** Balanced Foundation

**Rationale:**
- Minimal Core would duplicate 15+ settings across web-base and node-base
- Comprehensive would be too opinionated and reduce flexibility
- Balanced Foundation keeps derived configs minimal (5-8 additions for platform, 2-3 for lib/app) while avoiding duplication
- Provides maximum reuse without sacrificing flexibility

### Decision 2: Platform-Agnostic Base (No Module Settings)

**Options considered:**
1. Include `module: "preserve"` since most projects use bundlers
2. Remove `module` and `moduleResolution` from base ✅

**Chosen:** Remove module settings

**Rationale:**
- Node.js apps without bundlers need `module: "NodeNext"`
- Including bundler settings would force Node projects to override, creating asymmetry
- Platform-neutral base is cleaner and more predictable
- Each platform config (web-base, node-base) can set appropriate module strategy

### Decision 3: Maximum Strictness by Default

**Options considered:**
1. More lenient base, let projects opt-in to strictness
2. Enable all strict flags by default ✅

**Chosen:** Maximum strictness

**Rationale:**
- Easier to relax strictness (override in project config) than enforce it later
- New projects start with best practices
- Catches errors at compile time that would manifest as runtime bugs
- Migration pain is temporary, long-term benefits are permanent
- Projects can temporarily disable flags during migration

### Decision 4: ES2022 Target with ES2024 Lib

**Options considered:**
1. Align both target and lib to ES2023
2. Target ES2022 (2 versions back), lib ES2024 (penultimate) ✅

**Chosen:** ES2022 target, ES2024 lib

**Rationale:**
- Compiled output needs wide runtime compatibility
- Type definitions can be more modern since they don't affect runtime
- Gives "best of both worlds": compatible compiled code + modern DX
- Follows Total TypeScript recommendation for stable target

### Decision 5: Include Performance Settings in Base

**Options considered:**
1. Let projects enable `incremental`/`composite` when needed
2. Enable by default in base ✅

**Chosen:** Enable in base

**Rationale:**
- No downside to `incremental` - only creates `.tsbuildinfo` files
- `composite: true` enables project references but doesn't break projects that don't use them
- Monorepo benefits are significant (faster builds, better caching)
- All projects benefit from these settings

## Configuration Structure

Options organized into 4 logical groups:

### Group 1: Language & Target (5 options)
```json
{
  "target": "ES2022",
  "lib": ["ES2024"],
  "allowJs": true,
  "resolveJsonModule": true,
  "moduleDetection": "force"
}
```

### Group 2: Strictness (15 options)
```json
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noFallthroughCasesInSwitch": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "useUnknownInCatchVariables": true,
  "noPropertyAccessFromIndexSignature": true,
  "noImplicitOverride": true,
  "noImplicitReturns": true,
  "allowUnreachableCode": false,
  "allowUnusedLabels": false
}
```

### Group 3: ESM Interop & Isolation (4 options)
```json
{
  "esModuleInterop": true,
  "isolatedModules": true,
  "verbatimModuleSyntax": true,
  "forceConsistentCasingInFileNames": true
}
```

### Group 4: Performance (3 options)
```json
{
  "incremental": true,
  "composite": true,
  "skipLibCheck": true
}
```

### Excluded (Platform-Specific)
These will be set by derived configs:
- `module` - web uses `"preserve"`, node uses `"NodeNext"`
- `moduleResolution` - web uses `"bundler"`, node uses implicit `"NodeNext"`
- `lib` extensions - web adds `"DOM"`, node may add specific versions
- `noEmit`, `outDir`, `declaration`, `declarationMap` - Set by usage configs

## Configuration Hierarchy

```
tsconfig.base.json (this design)
├── tsconfig.web-base.json (future)
│   ├── tsconfig.web-lib.json (future)
│   └── tsconfig.web-app.json (future)
└── tsconfig.node-base.json (future)
    ├── tsconfig.node-lib.json (future)
    └── tsconfig.node-app.json (future)
```

**Extension example (web-lib):**
- Base: strictness + performance + ES2022/ES2024
- → Web-base adds: `module: "preserve"`, `moduleResolution: "bundler"`, `noEmit: true`, `lib: ["ES2024", "DOM"]`
- → Web-lib adds: `declaration: true`, `declarationMap: true`, overrides `noEmit: false`

## Risks / Trade-offs

### Risk: Migration Friction

**Risk:** Existing projects will see compilation errors from new strict flags

**Mitigation:**
- Document all new strict flags and what they catch
- Provide migration guide with common fixes
- Allow temporary overrides in project configs
- Implement in phases if needed (though not recommended - rip the band-aid)

### Risk: Composite Mode Complexity

**Risk:** `composite: true` requires project references setup

**Mitigation:**
- `composite` doesn't break projects that don't use references
- Document how to set up project references for those who want them
- Benefits (faster builds) outweigh complexity

### Trade-off: Target Lag

**Trade-off:** ES2022 target means newer JavaScript features are transpiled down

**Accepted because:**
- Runtime compatibility is more important than using native features
- Transpilation overhead is minimal with modern tools
- Can override in specific projects if needed

### Trade-off: Platform-Agnostic Removes Defaults

**Trade-off:** Projects can't directly extend base anymore, need platform config

**Accepted because:**
- Cleaner separation of concerns
- Explicit is better than implicit (know your platform)
- Future platform configs will be created anyway
- During transition, projects can temporarily add module settings to their own config

## Migration Plan

### Phase 1: Update Base Config (This Proposal)
1. Update `tsconfig.base.json` with 4 logical groups
2. Add inline comments explaining each group
3. Validate with `openspec validate define-base-tsconfig --strict`

### Phase 2: Documentation
1. Add README.md to `packages/ts-configs/` explaining hierarchy
2. Document migration path for existing projects
3. Provide examples of platform-specific configs

### Phase 3: Gradual Adoption
1. New projects use new base config
2. Existing projects migrate when ready
3. Provide override examples for teams needing time to fix strict errors

### Phase 4: Platform Configs (Future Proposal)
1. Create web-base, node-base configs
2. Create lib/app configs for each platform
3. Update all projects to use appropriate derived config

## Open Questions

None - design approved and ready for implementation.

## References

- [Total TypeScript TSConfig Cheat Sheet](https://www.totaltypescript.com/tsconfig-cheat-sheet)
- [TypeScript Compiler Options Documentation](https://www.typescriptlang.org/tsconfig)
- OpenSpec AGENTS.md workflow
