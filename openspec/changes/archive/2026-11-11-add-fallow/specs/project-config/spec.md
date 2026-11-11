# project-config — Delta Spec

## ADDED Requirements

### Requirement: Pre-commit SHALL run a changed-code fallow audit once per commit

`lint-staged.config.ts` SHALL declare a global function task for the JS surface (`*.{ts,tsx,js,jsx,mjs,cjs,json,jsonc}`) returning `fallow audit`. The function form ignores the staged-file list, so the audit runs once per commit rather than once per file. `fallow audit` gates changed files against the git merge-base with the default new-only ratchet: only findings introduced by the commit fail the verdict; inherited findings are reported but do not block. The full-repo `lint:fallow` script (`fallow dead-code --fail-on-issues`) SHALL NOT be invoked from lint-staged — it remains exclusive to the push CI gate.

#### Scenario: Commit touching the JS surface runs the audit once and blocks on introduced findings

- **WHEN** a commit stages at least one file matching `*.{ts,tsx,js,jsx,mjs,cjs,json,jsonc}`
- **THEN** lint-staged runs `fallow audit` exactly once for the whole commit
- **AND** the commit is blocked iff the audit verdict is fail on findings introduced by the changeset

#### Scenario: Docs-only commit skips the audit

- **WHEN** a commit stages only files outside the JS-surface glob (e.g. `*.md`, `*.css`)
- **THEN** lint-staged does not invoke `fallow audit`
