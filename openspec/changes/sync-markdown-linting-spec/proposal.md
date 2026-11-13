# Proposal

## Why

`openspec/specs/markdown-linting/spec.md` no longer matches how Markdown is linted. Markdownlint now reads its rules from `.markdownlint.jsonc` through an explicit `--config` flag, lints `AGENTS.md` and `CLAUDE.md` like any other guide, and excludes agent and OpenSpec directories only at the repository root. CI validates only `openspec validate --changes`, so nothing catches the drift in the living spec.

## What Changes

- Replace "Directory Exclusion" with "Root-Anchored Path Exclusion": excluded paths are root-anchored for the agent, editor and OpenSpec directories, and `AGENTS.md` and `CLAUDE.md` are linted instead of ignored.
- Replace "Configurable Rules" with "Explicit Rule Configuration": rules come from `.markdownlint.jsonc` passed with `--config`, a missing or unparsable file fails the run, and the `$schema` version must match the engine.
- No code or configuration changes: the same pull request already implements the behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `markdown-linting`: directory exclusion and rule configuration track the shipped `.markdownlintignore`, `.markdownlint.jsonc` and schema guard.

## Impact

- Spec only: `openspec/specs/markdown-linting/spec.md` changes when this change is archived.
- Already implemented by `.markdownlint.jsonc`, `.markdownlintignore`, `scripts/check-markdownlint-schema.cjs`, the `package.json` scripts and the CI step in this pull request.
