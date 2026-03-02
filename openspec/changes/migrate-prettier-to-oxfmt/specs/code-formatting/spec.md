## ADDED Requirements

### Requirement: oxfmt as workspace formatter
The workspace SHALL use oxfmt as the sole code formatter, configured via a single `.oxfmtrc.json` at the workspace root.

#### Scenario: Format check passes on clean codebase
- **WHEN** `oxfmt --check` is run from workspace root
- **THEN** all files pass formatting validation with zero errors

#### Scenario: Format write reformats files
- **WHEN** `oxfmt` is run from workspace root
- **THEN** all eligible files are reformatted in-place according to `.oxfmtrc.json`

### Requirement: Root-only configuration
The formatter SHALL be configured exclusively at the workspace root. No per-project formatter config files or ignore files SHALL exist.

#### Scenario: No per-project config files
- **WHEN** the workspace is inspected
- **THEN** no `.prettierrc`, `.prettierignore`, or `.oxfmtrc.json` files exist inside `apps/` or `packages/` directories

#### Scenario: Ignore patterns cover all projects
- **WHEN** `.oxfmtrc.json` `ignorePatterns` is evaluated
- **THEN** `**/dist/**`, `**/coverage/**`, `**/.nx/**`, `**/openspec/**`, `**/.claude/**`, `**/.opencode/**`, `**/CHANGELOG.md`, and `**/reports/**` are excluded from formatting

### Requirement: Minimal non-default configuration
The `.oxfmtrc.json` SHALL only specify values that differ from oxfmt defaults. Default values (e.g., `printWidth: 100`, `trailingComma: "all"`, `useTabs: false`) SHALL NOT be included.

#### Scenario: Config contains only overrides
- **WHEN** `.oxfmtrc.json` is inspected
- **THEN** it contains only: `$schema`, `tabWidth`, `singleAttributePerLine`, `ignorePatterns`, `sortImports`, and `overrides`

### Requirement: Import sorting with internal package recognition
The formatter SHALL sort imports with `@m0n0lab/*` packages classified as internal. Import sorting SHALL use flat style (no newlines between groups).

#### Scenario: Internal packages grouped correctly
- **WHEN** a file imports from `@m0n0lab/ts-types` and `react`
- **THEN** `react` is sorted in the external group and `@m0n0lab/ts-types` in the internal group

#### Scenario: No newlines between import groups
- **WHEN** imports are sorted
- **THEN** no blank lines are inserted between import groups

#### Scenario: Type-only imports grouped separately
- **WHEN** a file has both `import type { Foo }` and `import { bar }` from different modules
- **THEN** type-only imports are grouped after value imports

### Requirement: Root-level Nx targets
The workspace SHALL define `lint:oxcfmt` and `lint:oxcfmt:fix` as root-level Nx targets. No per-project formatter targets SHALL exist.

#### Scenario: lint:oxcfmt runs from root
- **WHEN** `pnpm nx lint:oxcfmt` is run
- **THEN** `oxfmt --check` executes against the entire workspace

#### Scenario: lint:oxcfmt:fix runs from root
- **WHEN** `pnpm nx lint:oxcfmt:fix` is run
- **THEN** `oxfmt` executes and reformats all eligible files

#### Scenario: No per-project formatter scripts
- **WHEN** any project's `package.json` is inspected
- **THEN** no `lint:prettier`, `lint:prettier:fix`, `lint:oxcfmt`, or `lint:oxcfmt:fix` scripts exist

### Requirement: ESLint-formatter conflict detection
The workspace SHALL keep `eslint-config-prettier` and per-project `lint:eslint:config-check` scripts to detect ESLint rules that conflict with the formatter.

#### Scenario: Config check detects conflicts
- **WHEN** `lint:eslint:config-check` runs in any project
- **THEN** it reports any ESLint rules that conflict with formatter output

### Requirement: Unused import auto-removal via ESLint
ESLint SHALL auto-remove unused imports when `--fix` is applied, replacing the behavior previously provided by `prettier-plugin-organize-imports`.

#### Scenario: eslint --fix removes unused import
- **WHEN** a file contains an unused import and `eslint --fix` is run
- **THEN** the unused import is automatically removed

#### Scenario: Used imports are preserved
- **WHEN** a file contains only used imports and `eslint --fix` is run
- **THEN** all imports remain unchanged

### Requirement: lint-staged integration
The pre-commit hook SHALL run `oxfmt` (not `prettier`) on staged files via lint-staged.

#### Scenario: Commit triggers oxfmt
- **WHEN** files are committed via git
- **THEN** lint-staged runs `oxfmt` on the staged files

### Requirement: Git blame preservation
Reformat commits SHALL be added to `.git-blame-ignore-revs` so `git blame` skips them.

#### Scenario: Blame ignores reformat commits
- **WHEN** `git blame` is run on any file
- **THEN** the prettier v3 reformat and oxfmt reformat commits are skipped

### Requirement: No prettier artifacts remain
After migration, no prettier-related config files, ignore files, or dependencies SHALL remain (except `eslint-config-prettier`).

#### Scenario: Dependencies cleaned
- **WHEN** `package.json` is inspected
- **THEN** `prettier`, `prettier-plugin-organize-imports`, and `prettier-plugin-packagejson` are absent
- **AND** `eslint-config-prettier` is present
- **AND** `oxfmt` is present as a devDependency

#### Scenario: Config files cleaned
- **WHEN** the workspace is inspected
- **THEN** no `.prettierrc`, `.prettierrc.json`, or `.prettierignore` files exist anywhere
