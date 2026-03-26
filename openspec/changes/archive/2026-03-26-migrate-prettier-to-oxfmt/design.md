## Context

monolab uses prettier 2.8.8 with two plugins (`prettier-plugin-organize-imports`, `prettier-plugin-packagejson`) and per-project `lint:prettier` / `lint:prettier:fix` scripts. Each of the 9 projects has its own `.prettierignore` (all identical to root patterns). The `lint:prettier` Nx target is cached with per-project inputs. `lint-staged` runs `prettier --write --ignore-unknown` on commit.

oxfmt is a Rust-based Prettier-compatible formatter (100% JS/TS conformance) with built-in import sorting and package.json sorting. It runs from root against the entire workspace.

## Goals / Non-Goals

**Goals:**
- Replace prettier with oxfmt as the single formatter
- Consolidate from per-project formatter config to single root-level config + command
- Maintain `eslint-config-prettier` integration for ESLint rule conflict detection
- Replace `prettier-plugin-organize-imports` unused-import-removal with ESLint autofix
- Two-phase migration (prettier v3 first, then oxfmt) for reviewable diffs
- Zero behavioral regressions: all lint, tests, and formatting checks pass post-migration

**Non-Goals:**
- Migrating to oxlint (separate initiative)
- Changing import grouping style (keep flat, no newlines between groups)
- Modifying ESLint rules beyond the `enableAutofixRemoval` addition

## Decisions

### 1. Two-phase migration: prettier v3.8 → oxfmt

**Choice**: Update prettier to v3.8 and reformat first, then migrate to oxfmt.

**Why**: oxfmt targets Prettier v3.8 compatibility. Jumping from v2.8.8 directly would produce a diff mixing Prettier 2→3 changes with oxfmt-specific differences. Two commits keep diffs reviewable and bisectable.

**Alternative**: Direct migration from 2.8.8 → oxfmt. Rejected — larger, harder-to-review diff.

### 2. Root-only formatter command (no per-project targets)

**Choice**: Single `oxfmt` / `oxfmt --check` at workspace root. Remove per-project `lint:prettier` scripts.

**Why**: oxfmt runs from root against the whole workspace. Per-project scripts add maintenance overhead with no benefit — the root `.oxfmtrc.json` with `ignorePatterns` handles everything. The per-project `.prettierignore` files are all identical to root patterns.

**Nx integration**: Define `lint:oxfmt` as a root-level target in `nx.json` (or root `package.json` scripts), not as per-project targets. This simplifies the target dependency graph — `lint` no longer depends on `^lint:prettier` chain.

**Alternative**: Keep per-project targets. Rejected — unnecessary duplication, oxfmt doesn't benefit from per-project runs.

### 3. oxfmt config (`.oxfmtrc.json`)

**Choice**: Single `.oxfmtrc.json` at root:

```jsonc
{
    "$schema": "./node_modules/oxfmt/configuration_schema.json",
    "tabWidth": 4,
    "singleAttributePerLine": true,
    "ignorePatterns": [
        "**/dist/**",
        "**/coverage/**",
        "**/.nx/**",
        "**/openspec/**",
        "**/.claude/**",
        "**/.opencode/**",
        "**/CHANGELOG.md",
        "**/reports/**"
    ],
    "sortImports": {
        "internalPattern": ["@m0n0lab/"],
        "newlinesBetween": false,
        "groups": [
            "value-builtin",
            "value-external",
            ["value-internal", "value-subpath"],
            ["value-parent", "value-sibling", "value-index"],
            "type-import",
            "unknown"
        ]
    },
    "overrides": [
        { "files": [".nvmrc"], "options": { "printWidth": 1 } }
    ]
}
```

Only non-default values are specified. Defaults we rely on: `printWidth: 100`, `trailingComma: "all"`, `useTabs: false`.

**Key decisions**:
- `tabWidth: 4` — override default of 2, matches current prettier config
- `singleAttributePerLine: true` — override default of false, matches current prettier config
- `sortImports.internalPattern: ["@m0n0lab/"]` — classifies workspace packages as internal, not external
- `sortImports.newlinesBetween: false` — flat import style, matches current codebase convention
- `sortImports.groups` — uses qualified selectors (`value-builtin`, `value-external`, `type-import`, etc.) per oxfmt docs. Differs from default by collapsing type imports into a single `type-import` group at the end
- `.nvmrc` override — preserves the existing `.prettierrc` override for this file

### 4. Keep `eslint-config-prettier`

**Choice**: Retain `eslint-config-prettier` and per-project `lint:eslint:config-check` scripts.

**Why**: Officially recommended by oxfmt migration guide. oxfmt is Prettier-compatible, so the same ESLint style rules that conflict with Prettier will conflict with oxfmt. The `config-check` scripts verify no ESLint rules are fighting the formatter.

**Alternative**: Remove it. Rejected — risk of silent ESLint/formatter conflicts.

### 5. Unused import removal via ESLint autofix

**Choice**: Enable `@typescript-eslint/no-unused-vars` with `enableAutofixRemoval.imports: true`.

**Why**: `prettier-plugin-organize-imports` silently removed unused imports via TS language service. oxfmt's `sortImports` only sorts — it doesn't remove. The rule is already active (from `tseslint.configs.recommended`) but only as a suggestion fixer. Enabling `enableAutofixRemoval.imports` makes `eslint --fix` auto-remove unused imports.

**ESLint config change**:

```ts
{
    rules: {
        "@typescript-eslint/no-unused-vars": ["error", {
            enableAutofixRemoval: { imports: true }
        }]
    }
}
```

**Alternative**: Add `eslint-plugin-unused-imports`. Rejected — unnecessary new dep when existing rule supports it.

### 6. lint-staged update

**Choice**: Replace `prettier --write --ignore-unknown` with `oxfmt` in `lint-staged.config.ts`.

```ts
// before
"prettier --write --ignore-unknown",
// after
"oxfmt",
```

oxfmt already ignores unknown file types and writes in-place by default.

## Risks / Trade-offs

**oxfmt is beta** → Mitigated by: 100% Prettier JS/TS conformance, adopted by Vue/Turborepo/Sentry, active development. Can pin version to avoid surprise breaks.

**Import sorting behavior change** → Mitigated by: `newlinesBetween: false` keeps flat style. `internalPattern` correctly classifies `@m0n0lab/*`. Post-migration verification step confirms correct grouping.

**`printWidth` 80→100 causes mass reformatting** → Mitigated by: `.git-blame-ignore-revs` preserves blame history. Two-step migration isolates the diff.

**`prettier-plugin-organize-imports` removal loses unused import auto-removal in formatter** → Mitigated by: `@typescript-eslint/no-unused-vars` with `enableAutofixRemoval.imports: true` covers the same behavior via `eslint --fix`. lint-staged already runs `nx affected -t lint:eslint:fix` before the formatter command, so unused imports are removed before formatting on commit.

**Root-only target breaks `nx affected` per-project formatting** → Trade-off accepted: formatting the whole workspace is fast enough with oxfmt (30x speedup). No need for per-project granularity.

## Migration Plan

### Phase 1: Update prettier to v3.8

1. Update `prettier` 2.8.8 → 3.8.x in root `package.json`
2. Update `prettier-plugin-organize-imports` and `prettier-plugin-packagejson` to latest compatible versions
3. Run `prettier --write .` to reformat entire codebase
4. Verify: `prettier --check .` passes, `eslint` passes, all tests pass
5. Commit: `style: reformat with prettier v3`
6. Add commit hash to `.git-blame-ignore-revs`

### Phase 2: Migrate to oxfmt

1. Install `oxfmt` as devDependency
2. Run `oxfmt --migrate=prettier` to generate `.oxfmtrc.json`
3. Manually adjust config: add `sortImports`, `internalPattern`, `ignorePatterns`, remove defaults auto-migrated from prettier
4. Delete `.prettierrc`, root `.prettierignore`, all per-project `.prettierignore` files
5. Remove `prettier`, `prettier-plugin-organize-imports`, `prettier-plugin-packagejson` from deps
6. Run `oxfmt` to reformat entire codebase
7. Verify: `oxfmt --check` passes
8. Commit: `style: reformat with oxfmt`
9. Add commit hash to `.git-blame-ignore-revs`

### Phase 3: Update tooling

1. Update all per-project `package.json`: remove `lint:prettier`, `lint:prettier:fix` scripts
2. Update `nx.json`: remove `lint:prettier` target defaults, add root `lint:oxfmt` target
3. Update `lint-staged.config.ts`: `prettier --write --ignore-unknown` → `oxfmt`
4. Update `eslint.config.ts`: add `enableAutofixRemoval.imports` to `no-unused-vars`
5. Commit: `chore: migrate tooling from prettier to oxfmt`

### Phase 4: Verification

1. `oxfmt --check` — formatter check passes
2. `pnpm nx run-many -t lint:eslint` — ESLint passes across all projects
3. `pnpm nx run-many -t lint:eslint:config-check` — no ESLint/formatter conflicts
4. `pnpm nx run-many -t test:unit` — all tests pass
5. Test `eslint --fix` on a file with an unused import — confirms auto-removal works
6. Test import sorting on a file with `@m0n0lab/*` imports — confirms internal grouping

### Rollback

Revert the commits. Prettier config and deps are in git history. No data migration involved.
